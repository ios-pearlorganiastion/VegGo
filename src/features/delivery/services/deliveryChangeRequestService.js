import apiClient from "../../../api/axiosInstance";
import { DELIVERY_ENDPOINTS } from "../../../constants/endpoints.constants";

// List change requests.
// params: status (PENDING | APPROVED | REJECTED | CANCELLED), section (BASIC_INFO | LICENSE | VEHICLE | BANK),
//         userId, page, size
// No filters = review queue (PENDING, oldest first). userId alone = that rider's full history.
export const getChangeRequests = async (params = {}) => {
  const response = await apiClient.get(DELIVERY_ENDPOINTS.CHANGE_REQUESTS, {
    params: { page: 0, size: 20, ...params },
  });
  return response.data;
};

export const getChangeRequestDetail = async (requestId) => {
  const response = await apiClient.get(
    DELIVERY_ENDPOINTS.CHANGE_REQUEST_DETAIL(requestId)
  );
  return response.data;
};

export const approveChangeRequest = async (requestId) => {
  const response = await apiClient.put(
    DELIVERY_ENDPOINTS.CHANGE_REQUEST_APPROVE(requestId)
  );
  return response.data;
};

// reason: required, not blank, max 500 characters (shown to the rider)
export const rejectChangeRequest = async (requestId, reason) => {
  const response = await apiClient.put(
    DELIVERY_ENDPOINTS.CHANGE_REQUEST_REJECT(requestId),
    null,
    { params: { reason: (reason || "").trim() } }
  );
  return response.data;
};
