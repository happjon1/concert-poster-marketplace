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
      description?: string;
      price: number;
      condition: string;
      dimensions: string;
      imageUrl: string;
      images: string[];
      listingType: "buyNow" | "auction";
      auctionEndDate?: Date | null;
      sellerId: string;
      artists: Array<{ id: string; name: string }>;
      events: Array<{ id: string; name: string; venue: string; date: string }>;
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
      artistIds: string[];
      eventIds: string[];
      price: number;
      description: string;
      condition: string;
      dimensions: string;
      imageUrls: string[];
      listingType: "buyNow" | "auction";
      auctionEndDate?: Date | null;
    }

    export type CreateOutput = PosterData;

    export interface UpdateInput {
      id: number;
      title?: string;
      artistIds?: string[];
      eventIds?: string[];
      price?: number;
      description?: string;
      condition?: string;
      dimensions?: string;
      images?: string[];
      listingType?: "buyNow" | "auction";
      auctionEndDate?: Date | null;
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

  export namespace Artists {
    export interface Artist {
      id: string;
      name: string;
      bio?: string;
      imageUrl?: string;
      createdAt: Date;
      updatedAt: Date;
    }

    export interface GetAllInput {
      limit?: number;
      cursor?: string;
      search?: string;
    }

    export interface GetAllOutput {
      items: Artist[];
      nextCursor: string | null;
    }

    export interface GetByIdInput {
      id: string;
    }

    export type GetByIdOutput = Artist;

    export interface CreateInput {
      name: string;
      bio?: string;
      imageUrl?: string;
    }

    export type CreateOutput = Artist;

    export interface UpdateInput {
      id: string;
      name?: string;
      bio?: string;
      imageUrl?: string;
    }

    export type UpdateOutput = Artist;

    export interface DeleteInput {
      id: string;
    }

    export interface DeleteOutput {
      success: boolean;
      message: string;
    }
  }

  export namespace Events {
    export interface Event {
      id: string;
      name: string;
      date: string;
      venue: string;
      location?: string;
      description?: string;
      imageUrl?: string;
      artistIds?: string[];
      createdAt: Date;
      updatedAt: Date;
    }

    export interface GetAllInput {
      limit?: number;
      cursor?: string;
      search?: string;
      artistId?: number;
      fromDate?: string;
      toDate?: string;
    }

    export interface GetAllOutput {
      items: Event[];
      nextCursor: string | null;
    }

    export interface GetByIdInput {
      id: string;
    }

    export type GetByIdOutput = Event;

    export interface CreateInput {
      name: string;
      date: string;
      venue: string;
      location?: string;
      description?: string;
      imageUrl?: string;
      artistIds?: string[];
    }

    export type CreateOutput = Event;

    export interface UpdateInput {
      id: string;
      name?: string;
      date?: string;
      venue?: string;
      location?: string;
      description?: string;
      imageUrl?: string;
      artistIds?: string[];
    }

    export type UpdateOutput = Event;

    export interface DeleteInput {
      id: string;
    }

    export interface DeleteOutput {
      success: boolean;
      message: string;
    }
  }

  export namespace Upload {
    export interface GetSignedUrlInput {
      fileName: string;
      fileType: string;
    }

    export interface GetSignedUrlOutput {
      uploadUrl: string;
      publicUrl: string;
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
  artists: {
    getAll: {
      query: (
        input?: RouterTypes.Artists.GetAllInput
      ) => Promise<RouterTypes.Artists.GetAllOutput>;
      mutate: never;
    };
    getById: {
      query: (
        input: RouterTypes.Artists.GetByIdInput
      ) => Promise<RouterTypes.Artists.GetByIdOutput>;
      mutate: never;
    };
    create: {
      mutate: (
        input: RouterTypes.Artists.CreateInput
      ) => Promise<RouterTypes.Artists.CreateOutput>;
      query: never;
    };
    update: {
      mutate: (
        input: RouterTypes.Artists.UpdateInput
      ) => Promise<RouterTypes.Artists.UpdateOutput>;
      query: never;
    };
    delete: {
      mutate: (
        input: RouterTypes.Artists.DeleteInput
      ) => Promise<RouterTypes.Artists.DeleteOutput>;
      query: never;
    };
  };
  events: {
    getAll: {
      query: (
        input?: RouterTypes.Events.GetAllInput
      ) => Promise<RouterTypes.Events.GetAllOutput>;
      mutate: never;
    };
    getById: {
      query: (
        input: RouterTypes.Events.GetByIdInput
      ) => Promise<RouterTypes.Events.GetByIdOutput>;
      mutate: never;
    };
    create: {
      mutate: (
        input: RouterTypes.Events.CreateInput
      ) => Promise<RouterTypes.Events.CreateOutput>;
      query: never;
    };
    update: {
      mutate: (
        input: RouterTypes.Events.UpdateInput
      ) => Promise<RouterTypes.Events.UpdateOutput>;
      query: never;
    };
    delete: {
      mutate: (
        input: RouterTypes.Events.DeleteInput
      ) => Promise<RouterTypes.Events.DeleteOutput>;
      query: never;
    };
  };
  upload: {
    getSignedUrl: {
      mutate: (
        input: RouterTypes.Upload.GetSignedUrlInput
      ) => Promise<RouterTypes.Upload.GetSignedUrlOutput>;
      query: never;
    };
  };
  users: {
    // User router definitions
  };
};
