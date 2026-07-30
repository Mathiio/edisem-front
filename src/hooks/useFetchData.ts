import { useCallback, useEffect, useState } from 'react';
import { getDataByClass, getDataByUrl, fetchRT, Data, getAllProperties } from '../services/Items';

export const useGetDataByClass = (resourceClassId: number | null, refreshTrigger: number = 0) => {
  const [data, setData] = useState<Data[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const getData = async () => {
      if (resourceClassId !== null) {
        setLoading(true);
        try {
          const fetchedData = await getDataByClass(resourceClassId);
          setData(Array.isArray(fetchedData) ? fetchedData : [fetchedData]);
        } catch (error) {
          if (error instanceof Error) {
            setError(error);
          } else {
            setError(new Error('An unknown error occurred'));
          }
        } finally {
          setLoading(false);
        }
      } else {
        setData(undefined);
        setLoading(false);
      }
    };

    getData();
   
  }, [resourceClassId, refreshTrigger]);

  return { data, loading, error };
};

export const useGetDataByClassDetails = (ItemUrl: string | null) => {
  const [data, setData] = useState<Data[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (ItemUrl) {
        const fetchedData = await getDataByUrl(ItemUrl);
        setData(Array.isArray(fetchedData) ? fetchedData : [fetchedData]);
      } else {
        setData(undefined);
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error);
        console.error('Error fetching data:', error);
      } else {
        setError(new Error('An unknown error occurred'));
        console.error('Unknown error fetching data');
      }
    } finally {
      setLoading(false);
    }
  }, [ItemUrl]);

  useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

  return { data, loading, error, refetch: fetchDetails };
};



export const useFetchRT = (resourceTemplateId: number | null) => {
  const [data, setData] = useState<Data[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRTData = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (resourceTemplateId !== null) {
      try {
        const fetchedData = await fetchRT(resourceTemplateId);
        setData(Array.isArray(fetchedData) ? fetchedData : [fetchedData]);
      } catch (error) {
        if (error instanceof Error) {
          setError(error);
          console.error('Error fetching data:', error);
        } else {
          setError(new Error('An unknown error occurred'));
          console.error('Unknown error fetching data');
        }
      } finally {
        setLoading(false);
      }
    } else {
      setData(undefined);
      setLoading(false);
    }
  }, [resourceTemplateId]);

  useEffect(() => {
    void fetchRTData();
  }, [fetchRTData]);

  return { data, loading, error, refetch: fetchRTData };
};

export const useGetAllProperties = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const getData = async () => {  
      try {
        const fetchedData = await getAllProperties();
       
        setData(fetchedData);
      } catch (error) {
        if (error instanceof Error) {
          setError(error);
          console.error('Error fetching data:', error);
        } else {
          setError(new Error('An unknown error occurred'));
          console.error('Unknown error fetching data');
        }
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  return { data, loading, error };
};