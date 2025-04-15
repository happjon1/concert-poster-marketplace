import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import stripe from "../../config/stripe.js";
import prisma from "../../config/prisma.js";

export const stripeRouter = router({
  // For buyers: Create a customer and save payment method
  createPaymentMethod: protectedProcedure
    .input(
      z.object({
        paymentMethodId: z.string(),
        makeDefault: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      const userId = ctx.userId;

      try {
        // Get the user
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // If the user doesn't have a Stripe customer ID, create one
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name || undefined,
            phone: user.phone || undefined,
          });

          stripeCustomerId = customer.id;

          // Update the user with the new customer ID
          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId },
          });
        }

        // Attach the payment method to the customer
        await stripe.paymentMethods.attach(input.paymentMethodId, {
          customer: stripeCustomerId,
        });

        // If this is set to be the default payment method, update it in Stripe
        if (input.makeDefault) {
          await stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
              default_payment_method: input.paymentMethodId,
            },
          });
        }

        // Get the payment method details from Stripe
        const paymentMethod = await stripe.paymentMethods.retrieve(
          input.paymentMethodId
        );

        // If this is the first payment method or set as default, mark it as default
        const existingMethods = await prisma.paymentMethod.count({
          where: { userId },
        });

        const isDefault = input.makeDefault || existingMethods === 0;

        // If this is going to be the default, unset any existing defaults
        if (isDefault) {
          await prisma.paymentMethod.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
          });
        }

        // Store the payment method in our database
        const dbPaymentMethod = await prisma.paymentMethod.create({
          data: {
            userId,
            stripePaymentId: input.paymentMethodId,
            type: paymentMethod.type,
            isDefault,
            last4: paymentMethod.card?.last4,
            brand: paymentMethod.card?.brand,
            expiryMonth: paymentMethod.card?.exp_month,
            expiryYear: paymentMethod.card?.exp_year,
          },
        });

        return {
          success: true,
          paymentMethod: dbPaymentMethod,
        };
      } catch (error) {
        console.error("Error creating payment method:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create payment method",
          cause: error,
        });
      }
    }),

  // Get all saved payment methods for a user
  getPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }
    const userId = ctx.userId;

    try {
      const paymentMethods = await prisma.paymentMethod.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });

      return paymentMethods;
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch payment methods",
        cause: error,
      });
    }
  }),

  // Delete a payment method
  deletePaymentMethod: protectedProcedure
    .input(
      z.object({
        paymentMethodId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      const userId = ctx.userId;

      try {
        // Find the payment method in our database
        const paymentMethod = await prisma.paymentMethod.findFirst({
          where: {
            id: input.paymentMethodId,
            userId,
          },
        });

        if (!paymentMethod) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payment method not found",
          });
        }

        // Detach the payment method from the customer in Stripe
        await stripe.paymentMethods.detach(paymentMethod.stripePaymentId);

        // Delete the payment method from our database
        await prisma.paymentMethod.delete({
          where: { id: input.paymentMethodId },
        });

        // If this was the default payment method, set another one as default if available
        if (paymentMethod.isDefault) {
          const nextDefault = await prisma.paymentMethod.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
          });

          if (nextDefault) {
            await prisma.paymentMethod.update({
              where: { id: nextDefault.id },
              data: { isDefault: true },
            });
          }
        }

        return { success: true };
      } catch (error) {
        console.error("Error deleting payment method:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete payment method",
          cause: error,
        });
      }
    }),

  // For sellers: Create a Stripe Connect account
  createConnectedAccount: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }
    const userId = ctx.userId;

    try {
      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if the user already has a Stripe account
      if (user.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already has a Stripe account",
        });
      }

      // Create a Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: "express",
        country: "US", // Default country
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        business_profile: {
          url: "https://tubebazaar.com",
          mcc: "5999", // Miscellaneous and Specialty Retail Stores
        },
      });

      // Update the user with the new Stripe account ID
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeAccountId: account.id,
          stripeAccountStatus: "created",
        },
      });

      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env["FRONTEND_URL"]}/dashboard/seller/account/refresh`,
        return_url: `${process.env["FRONTEND_URL"]}/dashboard/seller/account/complete`,
        type: "account_onboarding",
      });

      return {
        success: true,
        accountId: account.id,
        accountLink: accountLink.url,
      };
    } catch (error) {
      console.error("Error creating Stripe Connect account:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Stripe Connect account",
        cause: error,
      });
    }
  }),

  // Get the status of a seller's Stripe Connect account
  getConnectedAccountStatus: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }
    const userId = ctx.userId;

    try {
      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.stripeAccountId) {
        return {
          hasAccount: false,
          accountStatus: null,
          accountDetails: null,
        };
      }

      // Get the account details from Stripe
      const account = await stripe.accounts.retrieve(user.stripeAccountId);

      // Update the user with the latest account status
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeAccountStatus: account.charges_enabled ? "verified" : "pending",
          stripeAccountDetails: JSON.parse(JSON.stringify(account)),
        },
      });

      return {
        hasAccount: true,
        accountStatus: account.charges_enabled ? "verified" : "pending",
        canReceivePayments: account.charges_enabled && account.payouts_enabled,
        accountDetails: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          requirements: account.requirements,
        },
      };
    } catch (error) {
      console.error("Error fetching Stripe Connect account status:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch Stripe Connect account status",
        cause: error,
      });
    }
  }),

  // Generate a new account link for onboarding
  createAccountLink: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }
    const userId = ctx.userId;

    try {
      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not have a Stripe account",
        });
      }

      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: user.stripeAccountId,
        refresh_url: `${process.env["FRONTEND_URL"]}/dashboard/seller/account/refresh`,
        return_url: `${process.env["FRONTEND_URL"]}/dashboard/seller/account/complete`,
        type: "account_onboarding",
      });

      return {
        success: true,
        accountLink: accountLink.url,
      };
    } catch (error) {
      console.error("Error creating Stripe account link:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Stripe account link",
        cause: error,
      });
    }
  }),

  // Create a login link for the Stripe Connect account dashboard
  createLoginLink: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }
    const userId = ctx.userId;

    try {
      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.stripeAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not have a Stripe account",
        });
      }

      // Create a login link for the Stripe dashboard
      const loginLink = await stripe.accounts.createLoginLink(
        user.stripeAccountId
      );

      return {
        success: true,
        loginLink: loginLink.url,
      };
    } catch (error) {
      console.error("Error creating Stripe login link:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Stripe login link",
        cause: error,
      });
    }
  }),
});
