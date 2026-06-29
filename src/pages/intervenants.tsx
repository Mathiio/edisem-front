import { Layouts } from "@/components/layout/Layouts";
import { getActantsGlobalStats, getRandomActants, getActantsByCountry } from "@/services/Items";
import { useEffect, useState } from "react";
import { IntervenantsCarousel } from "@/components/features/pages/intervenants/IntervenantsCarousel"; 
import { IntervenantsWorldMap } from "@/components/features/pages/intervenants/IntervenantsWorldMap";
import IntervenantsStats from "@/components/features/pages/intervenants/IntervenantsStats";
import KeywordUsageChart from "@/components/features/pages/intervenants/KeywordUsageChart";
import TopIntervenants from "@/components/features/pages/intervenants/TopIntervenants";
import { PageBanner } from "@/components/ui/PageBanner";

type LoadingState = {
    stats: boolean;
    randomActants: boolean;
    countriesData: boolean;
};


export const Intervenants: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [randomActants, setRandomActants] = useState<any[]>([]);
    const [countriesData, setCountriesData] = useState<any[]>([]);
    
    const [loading, setLoading] = useState<LoadingState>({
        stats: true,
        randomActants: true,
        countriesData: true,
    });

    useEffect(() => {
        const fetchAll = async () => {
            // Reset tous les loading à true
            setLoading({
                stats: true,
                randomActants: true,
                countriesData: true,
            });

            const promises = [
                getActantsGlobalStats().then(data => {
                    setStats(data);
                    setLoading(prev => ({ ...prev, stats: false }));
                }),
                
                getRandomActants(15).then(data => {
                    setRandomActants(data);
                    setLoading(prev => ({ ...prev, randomActants: false }));
                }),
                
                getActantsByCountry().then(data => {
                    setCountriesData(data);
                    setLoading(prev => ({ ...prev, countriesData: false }));
                }),
            ];

            await Promise.all(promises);
        };

        fetchAll();
    }, []);

    return (
        <Layouts className='col-span-10 flex flex-col gap-36 z-0 overflow-visible'>
            <PageBanner
                title={
                    <>
                        <span>Découvrez les voix</span>
                        <span className='bg-gradient-to-t from-action to-action2 text-transparent bg-clip-text bg-[length:150%] bg-top font-[500]'>
                        qui façonnent Edisem
                        </span>
                    </>
                }
                description="Retrouvez ici les chercheur·euses, artistes, doctorant·es et penseur·euses qui façonnent la réflexion autour des arts, du design, des humanités numériques et de l'intelligence artificielle."
            />
            <IntervenantsCarousel intervenants={randomActants} loading={loading.randomActants}/>
            
            <IntervenantsWorldMap countriesData={countriesData || null} loading={loading.countriesData}/>
            
            <IntervenantsStats counts={stats?.counts || null} loading={loading.stats}/>
            
            <KeywordUsageChart keywordsStats={stats?.keywords || null}/>
            
            <TopIntervenants actants={stats?.topActants || []}/>
        </Layouts>
    );
};
