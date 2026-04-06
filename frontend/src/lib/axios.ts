import axios from "axios";
import { AxiosHeaders } from "axios";

import { getAdminToken } from "./auth";

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }

  const token = getAdminToken();

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});