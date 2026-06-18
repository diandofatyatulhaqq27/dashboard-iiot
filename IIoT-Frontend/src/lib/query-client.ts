import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data dianggap "basi" setelah 2 detik
      staleTime: 2000, 
      // Otomatis ambil data baru setiap 5 detik (cocok untuk IIOT)
      refetchInterval: 5000, 
    },
  },
});