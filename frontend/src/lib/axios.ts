import axios from "axios";
import { getAdminToken } from "./auth";

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  if (!config.headers) {
    config.headers = {};
  }

  const token = getAdminToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});