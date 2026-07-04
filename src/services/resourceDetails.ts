import { ResourceDetails } from '@/types/ui';

const QUERY_API_URL = 'https://tests.arcanes.ca/omk/s/edisem/page/ajax';

const resourceDetailsCache = new Map<string, Promise<ResourceDetails | null>>();

/**
 * Fetch detailed resource information using unified backend endpoint
 * Works for conferences (seminaires, journées d'études, colloques) and experimentations
 * 
 * @param resourceId - The ID of the resource to fetch
 * @returns Promise with complete resource details
 */
export async function getResourceDetails(resourceId: string | number): Promise<ResourceDetails | null> {
    const cacheKey = String(resourceId);
    const cached = resourceDetailsCache.get(cacheKey);
    if (cached) return cached;

    const request = (async () => {
        try {
            const params = new URLSearchParams({
                helper: 'Query',
                action: 'getResourceDetails',
                json: '1',
                id: cacheKey,
            });

            const response = await fetch(`${QUERY_API_URL}?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result || !result.id) {
                return null;
            }

            return result as ResourceDetails;
        } catch (error) {
            resourceDetailsCache.delete(cacheKey);
            console.error('Error fetching resource details:', error);
            throw error;
        }
    })();

    resourceDetailsCache.set(cacheKey, request);
    return request;
}

/**
 * Fetch annotations specifically using the Query helper's getAnnotations action
 */
export async function getAnnotations(resourceId: string | number): Promise<any[]> {
    try {
        const params = new URLSearchParams({
            helper: 'Query',
            action: 'getAnnotations',
            json: '1',
            id: String(resourceId),
        });

        const response = await fetch(`${QUERY_API_URL}?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching annotations:', error);
        throw error;
    }
}
