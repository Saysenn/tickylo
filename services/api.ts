import axiosService from "./axios";

const V1 = "/api/v1";

/**
 * Typed API client. All requests go through the Axios singleton
 * which handles 401 redirects and credentials automatically.
 */
class APIService {
  private static instance: APIService;

  private constructor() {}

  public static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------
  public users = {
    me: () => axiosService.get(`${V1}/users/me`),
  };

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------
  public payments = {
    checkout: (plan: "Pro") => axiosService.post(`${V1}/payments/checkout`, { plan }),
    portal: () => axiosService.post(`${V1}/payments/portal`),
  };
}

export default APIService.getInstance();
