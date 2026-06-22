import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, Link, Popover, PopoverContent, PopoverTrigger, Spinner } from '@heroui/react';
import { useAuth } from '@/hooks/useAuth';
import { ApiProxy } from '@/services/ApiProxy';
import { getComments } from '@/services/Items';
import { formatDate } from '@/lib/utils';

import { AlertModal } from '../ui/AlertModal';

interface Comment {
  id: number;
  titre: string;
  contenu: string;
  author: string;
  avatar: string;
  timestamp: string;
  owner_id: number;
  actant?: number;
  actantName: string;
  commentTime?: string;
  commentText?: string;
  relatedResource?: string;
}

const CommentSection = ({ LinkedResourceId }: { LinkedResourceId: number }) => {
  const { isAuthenticated, userData } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    getComments().then((comments: Comment[]) => {
      // Filtrer les commentaires selon le LinkedResourceId
      const filteredComments = comments.filter((comment: Comment) => comment.relatedResource === LinkedResourceId.toString());
      setComments(filteredComments);
    });
  }, [LinkedResourceId]);

  const [newContenu, setNewContenu] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<number | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = (title: string, message: string, type: 'danger' | 'warning' | 'info' | 'success' = 'info') => {
    setAlertConfig({ isOpen: true, title, message, type });
  };

  const handleSubmit = async () => {
    if (!newContenu.trim()) {
      showAlert('Champs requis', 'Veuillez saisir votre commentaire', 'warning');
      return;
    }

    setIsLoading(true);

    if (!isAuthenticated) {
      showAlert('Connexion requise', 'Vous devez être connecté pour commenter', 'warning');
      setIsLoading(false);
      return;
    }

    try {
      // Structure JSON-LD pour Omeka S (Template 123: Edisem Commentaire)
      const commentData = {
        'o:resource_template': { 'o:id': 123 },
        'o:resource_class': { 'o:id': 302 }, // Edisem Commentaire
        'dcterms:title': [{ 'type': 'literal', 'property_id': 1, '@value': newContenu.trim() }],
        'schema:commentText': [{ 'type': 'literal', 'property_id': 561, '@value': newContenu.trim() }],
        'schema:commentTime': [{ 'type': 'literal', 'property_id': 562, '@value': new Date().toISOString() }],
        'jdc:hasActant': userData?.id ? [{ 'type': 'resource', 'property_id': 2095, 'value_resource_id': userData.id }] : [],
        'ma:hasRelatedResource': [{ 'type': 'resource', 'property_id': 1794, 'value_resource_id': LinkedResourceId }]
      };

      // Utiliser ApiProxy pour la création afin de forcer le owner au niveau backend
      const result = await ApiProxy.createItem(commentData);

      if (result && result['o:id']) {
        // Forcer le rechargement des commentaires depuis l'API
        try {
          const updatedComments = await getComments(); // Force refresh

          // Filtrer les commentaires selon le LinkedResourceId
          const filteredComments = updatedComments.filter((comment: Comment) => comment.relatedResource === LinkedResourceId.toString());
          setComments(filteredComments);

          // Trouver le commentaire qui vient d'être ajouté (le plus récent) dans les commentaires filtrés
          const newComment = filteredComments.find((comment: Comment) => comment.contenu === newContenu.trim());

          if (newComment) {
            setLastAddedId(newComment.id);
          }

          // Vider le champ
          setNewContenu('');

        } catch (refreshError) {
          console.error('Erreur lors du rechargement des commentaires:', refreshError);
          // En cas d'erreur, garder les commentaires actuels mais vider le champ
          setNewContenu('');
        }
      } else {
        throw new Error(result.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur lors de la création du commentaire:', error);
      showAlert('Erreur', 'Erreur lors de la création du commentaire. Veuillez réessayer.', 'danger');

      // Réinitialiser l'animation après 500ms
      setTimeout(() => setLastAddedId(null), 500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && newContenu.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className='w-full flex flex-col gap-6'>
      <h2 className='text-2xl font-medium text-c6 min-h-[32px]'>Commentaires</h2>

      {/* Zone de saisie */}
      <div className='w-full p-1.5 md:p-6 bg-c2 text-c6 rounded-xl flex flex-col gap-4'>
        {isAuthenticated ? (
          <textarea
            value={newContenu}
            onChange={(e) => setNewContenu(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Écrivez votre commentaire...'
            rows={3}
            maxLength={500}
            className='w-full bg-transparent text-c6 placeholder:text-[#adadad] text-sm outline-none resize-none'
          />
        ) : (
          <Popover isOpen={popoverOpen} onOpenChange={(open) => setPopoverOpen(open)}>
            <PopoverTrigger>
              <textarea
                value={newContenu}
                onChange={(e) => setNewContenu(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={() => setPopoverOpen(true)}
                placeholder='Écrivez votre commentaire...'
                rows={3}
                maxLength={500}
                className='w-full bg-transparent text-c6 placeholder:text-[#adadad] text-sm outline-none resize-none '
                readOnly
              />
            </PopoverTrigger>
            <PopoverContent className='p-4 flex flex-col gap-2 items-center max-w-[350px]'>
              <h3 className='text-base font-bold text-c6 text-center mb-px w-full'>Envie de participer à la conversation ?</h3>
              <div className='text-sm text-c4 text-center mb-2'>Connectez-vous pour continuer</div>
              <Link href='/login'>
                <Button size='sm' className='w-full bg-action' onClick={() => setPopoverOpen(false)}>
                  Se connecter
                </Button>
              </Link>
            </PopoverContent>
          </Popover>
        )}
        <div className='flex justify-between items-center'>
          <div className='text-xs text-[#adadad]'>{!isAuthenticated ? 'Connectez-vous pour commenter' : `${500 - newContenu.length} caractères restants`}</div>
          <Button
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={!isAuthenticated}
            className='px-4 py-2 bg-action hover:opacity-100 disabled:bg-action/50 disabled:cursor-not-allowed transition-all duration-300 rounded-md text-selected text-sm flex flex-row justify-center items-center gap-2'
            spinner={
              <Spinner 
                color='white' 
                size='sm' 
                classNames={{ 
                  circle1: 'w-[15px] h-[15px]', 
                  circle2: 'w-[15px] h-[15px]', 
                  wrapper: 'w-[15px] h-[15px]' 
                }} 
              />
            }
          >
            {isLoading ? 'Publication...' : 'Publier'}
          </Button>
        </div>
      </div>
      {/* Liste des commentaires */}
      <div className='w-full flex flex-col gap-4'>
          {comments.map((comment: any) => (
            <motion.div
              key={comment.id}
              className='w-full p-1.5 md:p-6 rounded-xl border-2 border-[#262233] flex gap-3'
              initial={comment.id === lastAddedId ? { opacity: 0, scale: 0.8, y: -20 } : false}
              animate={comment.id === lastAddedId ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{
                duration: 0.4,
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}>
              <img className='w-[45px] h-[45px] rounded-md flex-shrink-0' src={comment.actant?.picture || '/default-avatar.png'} alt={comment.author || 'Avatar'} />
              <div className='flex-1 flex flex-col gap-2'>
                <div className='flex items-center gap-2'>
                  <span className='text-c4 text-sm font-regular'>{comment.actant?.title || 'Anonyme'}</span>
                  <span className='text-[#adadad] text-xs'>{comment.commentTime ? formatDate(comment.commentTime) : "À l'instant"}</span>
                </div>
                <div className='flex flex-col gap-px'>
                  <p className='text-c6 font-regular text-sm opacity-90'>{comment.commentText}</p>
                </div>
              </div>
            </motion.div>
          ))
        }
      </div>

      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        description={alertConfig.message}
        type={alertConfig.type}
        confirmLabel='Ok'
        onConfirm={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default CommentSection;
