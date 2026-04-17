import axios from "axios";
import type { AxiosResponse, AxiosError } from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Response interceptor for generic error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError | any) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred";
    toast.error(message);
    return Promise.reject(error);
  },
);

export default api;
