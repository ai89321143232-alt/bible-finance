import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 1000 * 60 * 2, // 2 минуты — данные считаются свежими и берутся из кэша без повторного запроса
			gcTime: 1000 * 60 * 10,
		},
	},
});