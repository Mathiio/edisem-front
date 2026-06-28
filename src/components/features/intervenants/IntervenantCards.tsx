import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@heroui/react';
import { Link } from '@heroui/react';
import { ParticipateIcon, UserIcon } from '@/components/ui/icons';
import { Actant } from '@/types/ui';

// Card displaying an intervenant with name, photo, university and intervention count
export const IntervenantCard: React.FC<Actant & { disableClick?: boolean }> = ({ id, firstname, lastname, picture, interventions, universities, className, disableClick }) => {
  const navigate = useNavigate();

  // Navigate to intervenant's page
  const openIntervenantPage = () => {
    if (!disableClick) {
      navigate(`/intervenant/${id}`);
    }
  };

  return (
    <div
      data-testid="intervenant-card"
      onClick={disableClick ? undefined : openIntervenantPage}
      className={`shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] bg-c1 h-full border-c3 border-2 ${disableClick ? '' : 'cursor-pointer hover:bg-c2'} p-5 rounded-4xl flex flex-col items-center justify-center gap-5 transition-all duration-200 ${className || ''}`}>
      {/* Picture or fallback icon */}
      {picture ? (
        <img src={picture} alt={`${firstname} ${lastname}`} className='w-14 h-14 object-cover rounded-xl' />
      ) : (
        <div className='w-14 h-14 rounded-xl object-cover flex items-center justify-center bg-c3'>
          <UserIcon size={24} className='text-c6' />
        </div>
      )}
      {/* Intervenant name and University logos and names */}
      <div className='flex flex-col justify-center items-center gap-1.5'>
        <p className='text-base text-center text-c6 font-medium'>
          {firstname} {lastname}
        </p>
        <div className='flex-col flex items-center justify-center gap-1.5'>
          {universities.map((university, index) => (
            <div key={index} className='flex items-center justify-center gap-1.5'>
              <img src={university.logo} alt={university.shortName} className='w-auto h-4 object-cover rounded-full' />
              <p className='text-xs text-left text-c5 font-normal'>{university.shortName}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Number of interventions */}
      <div className='flex gap-1.5 items-center'>
        <ParticipateIcon size={20} className='text-c5' />
        <p className='text-sm text-c5 font-regular'>
          {interventions} interv{interventions > 1 ? '.' : '.'}
        </p>
      </div>
    </div>
  );
};

// Skeleton loader for IntervenantCard
export const IntervenantSkeleton: React.FC = () => {
  return (
    <div className='shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] border-c3 border-2 w-[250px] h-[220px] flex flex-col rounded-4xl items-center justify-center p-5 gap-5'>
      <Skeleton className='w-14 h-14 rounded-xl justify-center flex'></Skeleton>
      <div className='w-full flex flex-col justify-center items-center gap-1.5'>
        <Skeleton className='w-[60%] h-6 rounded-lg' />
        <Skeleton className='w-[40%] h-4 rounded-md' />
      </div>
      <div className='w-full flex flex-col justify-center items-center'>
        <Skeleton className='w-[30%] h-4 rounded-md' />
      </div>
    </div>
  );
};

type InfoCardProps = {
  name: string | undefined;
  link: string;
};

// Card displaying a simple piece of linked information
export const InfoCard: React.FC<InfoCardProps> = ({ name, link }) => {
  const content = (
    <div
      className={`
        shadow-[inset_0_0px_50px_rgba(255,255,255,0.06)] 
        border-c3 border-2 
        h-full w-full 
        rounded-2xl
        flex flex-col items-start justify-center 
        p-5 
        transition-all ease-in-out duration-200
        ${link ? 'cursor-pointer hover:bg-c2' : ''}
      `}
    >
      <div className='flex flex-col justify-center items-start gap-1.5'>
        <p className='text-base leading-[120%] text-c6 font-medium'>{name}</p>
      </div>
    </div>
  );
  // Render as link if provided
  return (
    <>
      {link ? (
        <Link isExternal className='gap-2.5 text-c6 w-full h-full' href={link}>
          {content}
        </Link>
      ) : (
        content
      )}
    </>
  );
};

// Skeleton loader for InfoCard
export const InfoSkeleton: React.FC = () => {
  return (
    <div className='h-full w-full flex flex-col rounded-xl items-start justify-start p-5 gap-1.5 bg-c4'>
      <Skeleton className='w-[100%] h-4 rounded-lg' />
      <Skeleton className='w-[60%] h-4 rounded-lg' />
    </div>
  );
};

export const IntervenantLongCard: React.FC<Actant> = ({ id, firstname, lastname, picture, interventions, universities, className }) => {
  const navigate = useNavigate();

  // Navigate to intervenant's page
  const openIntervenantPage = () => {
    navigate(`/intervenant/${id}`);
  };

  return (
    <div
      onClick={openIntervenantPage}
      className={`border-c3 border-2 hover:bg-c3/60 bg-c3/20 cursor-pointer h-full rounded-3xl flex items-center justify-between p-4 gap-4 transition-transform-all duration-200 ${className || ''}`}>
      <div className='flex items-center justify-start gap-4'>
        {/* Picture or fallback icon */}
        {picture ? (
          <img src={picture} alt={`${firstname} ${lastname}`} className='w-14 h-14 object-cover rounded-xl' />
        ) : (
          <div className='w-14 h-14 rounded-xl object-cover flex items-center justify-center bg-c3'>
            <UserIcon size={16} className='text-c6' />
          </div>
        )}
        <div className='flex flex-col justify-center items-start gap-1'>
          <p className='text-base text-center text-c6 font-medium'>
            {firstname} {lastname}
          </p>
          <div className='flex-col flex items-start justify-center gap-1.5'>
            {universities.map((university, index) => (
              <div key={index} className='flex items-center justify-center gap-1.5'>
                <img src={university.logo} alt={university.shortName} className='w-auto h-4 object-cover rounded-full' />
                <p className='text-sm text-left text-c5 font-normal'>{university.shortName}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className='flex gap-1.5 items-center'>
        <ParticipateIcon size={20} className='text-c5' />
        <p className='text-sm text-c5 font-regular'>
          {interventions} interv{interventions > 1 ? '.' : '.'}
        </p>
      </div>
    </div>
  );
};

export const IntervenantLongCardSkeleton: React.FC = () => {
  return (
    <div className='flex flex-col rounded-xl items-center justify-center p-5 gap-5 bg-c4'>
      <Skeleton className='w-20 h-20 rounded-xl justify-center flex' />
      <div className='w-full flex flex-col justify-center items-center gap-1.5'>
        <Skeleton className='w-[65%] h-4 rounded-lg' />
        <Skeleton className='w-[40%] h-4 rounded-lg' />
      </div>
      <div className='w-full flex flex-col justify-center items-center'>
        <Skeleton className='w-[85%] h-4 rounded-lg' />
      </div>
    </div>
  );
};
