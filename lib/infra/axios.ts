import axios, { AxiosInstance } from "axios";

/**
 * API Service Class
 * Handles SSR-safe requests, token refresh, and CRUD operations
 */
class AxiosService {
	private axiosInstance: AxiosInstance;
	private static apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

	constructor(baseURL: string = AxiosService.apiUrl) {
		this.axiosInstance = axios.create({
			baseURL,
			headers: { "Content-Type": "application/json" },
			withCredentials: true,
			timeout: 15000,
		});

		this.initResponseInterceptor();
	}

	/** Response interceptor — Supabase manages session refresh via cookies automatically.
	 *  On 401 we redirect to login; no manual token refresh needed. */
	private initResponseInterceptor() {
		this.axiosInstance.interceptors.response.use(
			(response) => response,
			(error) => {
				if (error.response?.status === 401) {
					if (typeof window !== "undefined") window.location.href = "/login";
				}
				return Promise.reject(error);
			},
		);
	}

	/** Validate response helper */
	private validateResponse(response: any) {
		if (!response) throw new Error("Invalid response from API");
		return response.data ?? null;
	}

	public getApiUrl() {
		return AxiosService.apiUrl;
	}

	/** GET request — strips undefined/null values from params before serializing */
	public async get<T = any>(url: string, params?: any): Promise<T> {
		const cleanParams = params
			? Object.fromEntries(
					Object.entries(params).filter(([, v]) => v !== undefined && v !== null),
			  )
			: undefined;
		const response = await this.axiosInstance.get(url, { params: cleanParams });
		return this.validateResponse(response);
	}

	/** POST request */
	public async post<T = any>(url: string, data?: any): Promise<T> {
		const response = await this.axiosInstance.post(url, data || {});
		return this.validateResponse(response);
	}

	/** PUT request */
	public async put<T = any>(url: string, data?: any, params?: any): Promise<T> {
		const response = await this.axiosInstance.put(url, data, { params });
		return this.validateResponse(response);
	}

	/** PATCH request */
	public async patch<T = any>(url: string, data?: any): Promise<T> {
		const response = await this.axiosInstance.patch(url, data);
		return this.validateResponse(response);
	}

	/** DELETE request — params go to query string, data goes to request body */
	public async delete<T = any>(url: string, params?: any, data?: any): Promise<T> {
		const response = await this.axiosInstance.delete(url, { params, data });
		return this.validateResponse(response);
	}

	/** Expose Axios instance for custom requests if needed */
	public get instance(): AxiosInstance {
		return this.axiosInstance;
	}
}

/** Export a singleton instance */
const axiosService = new AxiosService();
export default axiosService;
