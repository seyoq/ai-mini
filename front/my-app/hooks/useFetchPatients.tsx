// hooks/useFetchPatients.ts
import { useState, useEffect } from 'react';
import { fetchAllPatientData } from '@/services/patient'; // 환자 목록을 가져오는 함수 (서비스에서 정의 필요)

const useFetchPatients = () => {
  const [patients, setPatients] = useState<any[]>([]); // 전체 환자 목록
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getPatientsData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllPatientData(); // 전체 환자 데이터 호출
        setPatients(data);
      } catch (err) {
        setError('환자 데이터를 가져오는 중에 문제가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    getPatientsData();
  }, []);

  return { patients, loading, error };
};

export default useFetchPatients;
