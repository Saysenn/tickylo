import axiosService from "./axios";

const V1 = "/v1";

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
  // Employees
  // ---------------------------------------------------------------------------
  public employees = {
    list: (page = 1, limit = 10) => axiosService.get(`${V1}/employees`, { page, limit }),
    create: (data: { name: string; email: string; password: string; role: string }) =>
      axiosService.post(`${V1}/employees`, data),
    update: (id: string, data: { name?: string; role?: string }) =>
      axiosService.put(`${V1}/employees/${id}`, data),
    remove: (id: string) => axiosService.delete(`${V1}/employees/${id}`),
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
