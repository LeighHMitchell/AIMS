/**
 * Hook to control the global loading bar
 * 
 * Usage:
 * const { startLoading, stopLoading, isLoading } = useLoadingBar();
 * 
 * // Start loading when fetching data
 * startLoading();
 * await fetchData();
 * stopLoading();
 * 
 * // Or use with useEffect for automatic cleanup
 * useEffect(() => {
 *   if (loading) {
 *     startLoading();
 *   } else {
 *     stopLoading();
 *   }
 * }, [loading, startLoading, stopLoading]);
 */
export { useLoadingBar } from "@/components/providers/LoadingBarProvider";












