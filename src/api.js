import axios from 'axios';

export const API = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getChatbots = async () => {
  return await API.get('/chatbots/');
};

export const createChatbot = async (chatbotData) => {
  return await API.post('/chatbots/', chatbotData); 
};


export const uploadFile = async (file, node_type = 'file_upload') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('node_type', node_type);
  return await API.post('/chatbots/upload_file/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};


export const saveGraph = async (chatbotId, nodes, edges, files = {}) => {
  const formData = new FormData();
  formData.append('nodes', JSON.stringify(nodes));
  formData.append('edges', JSON.stringify(edges));

 
  Object.keys(files).forEach((key) => {
    formData.append(key, files[key]);
  });

  return await API.post(`/chatbots/${chatbotId}/save_graph/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
