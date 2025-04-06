/**
 * Shared router type definitions for the Concert Poster Marketplace
 */

// Core type definitions for inputs and outputs
export namespace RouterTypes {
  export namespace Auth {
    export interface RegisterInput {
      email: string;
      passwordHash: string;
      name?: string;
    }

    export type RegisterOutput = LoginOutput;

    export interface LoginInput {
      email: string;
      passwordHash: string;
    }

    export interface LoginOutput {
      token: string;
      refreshToken?: string;
      user: {
        id: string;
        email: string;
        name: string | null;
        isAdmin: boolean;
      };
    }

    export interface LogoutInput {
      token: string;
    }

    export interface LogoutOutput {
      success: boolean;
      message: string;
    }

    export type MeInput = void;
    export interface MeOutput {
      id: string;
      email: string;
      name: string | null;
      isAdmin: boolean;
      createdAt: Date;
      updatedAt: Date;
    }
  }

  export namespace Posters {
    export interface GetAllInput {
      limit?: number;
      cursor?: string;
      filter?: string;
    }

    export interface PosterData {
      id: number;
      title: string;
      artist: string;
      venue: string;
      price: number;
      date: string;
      description?: string;
      imageUrl: string;
      sellerId: string;
      createdAt: Date;
      updatedAt: Date;
    }

    export interface GetAllOutput {
      items: PosterData[];
      nextCursor: string | null;
    }

    export interface GetByIdInput {
      id: number;
    }

    export type GetByIdOutput = PosterData;

    export interface CreateInput {
      title: string;
      artist: string;
      venue: string;
      price: number;
      date: string;
      description: string;
      imageUrl: string;
    }

    export type CreateOutput = PosterData;

    export interface UpdateInput {
      id: number;
      title?: string;
      artist?: string;
      venue?: string;
      price?: number;
      date?: string;
      description?: string;
      imageUrl?: string;
    }

    export type UpdateOutput = PosterData;

    export interface DeleteInput {
      id: number;
    }

    export interface DeleteOutput {
      success: boolean;
      message: string;
    }
  }
}

// Client-side router type for use with tRPC client
export type ClientAppRouter = {
  auth: {
    register: {
      mutate: (
        input: RouterTypes.Auth.RegisterInput
      ) => Promise<RouterTypes.Auth.RegisterOutput>;
      query: never;
    };
    login: {
      mutate: (
        input: RouterTypes.Auth.LoginInput
      ) => Promise<RouterTypes.Auth.LoginOutput>;
      query: never;
    };
    logout: {
      mutate: (
        input: RouterTypes.Auth.LogoutInput
      ) => Promise<RouterTypes.Auth.LogoutOutput>;
      query: never;
    };
    me: {
      query: () => Promise<RouterTypes.Auth.MeOutput>;
      mutate: never;
    };
  };
  posters: {
    getAll: {
      query: (
        input?: RouterTypes.Posters.GetAllInput
      ) => Promise<RouterTypes.Posters.GetAllOutput>;
      mutate: never;
    };
    getById: {
      query: (
        input: RouterTypes.Posters.GetByIdInput
      ) => Promise<RouterTypes.Posters.GetByIdOutput>;
      mutate: never;
    };
    create: {
      mutate: (
        input: RouterTypes.Posters.CreateInput
      ) => Promise<RouterTypes.Posters.CreateOutput>;
      query: never;
    };
    update: {
      mutate: (
        input: RouterTypes.Posters.UpdateInput
      ) => Promise<RouterTypes.Posters.UpdateOutput>;
      query: never;
    };
    delete: {
      mutate: (
        input: RouterTypes.Posters.DeleteInput
      ) => Promise<RouterTypes.Posters.DeleteOutput>;
      query: never;
    };
  };
  users: {
    // User router definitions
  };
};
