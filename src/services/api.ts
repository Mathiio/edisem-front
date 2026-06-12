import * as Items from '@/services/Items';
import { ApiProxy } from '@/services/ApiProxy';
import { omekaApiUrl, OMEKA_API_BASE } from '@/utils/omekaApi';
// import { Actant } from "@/types/ui";

export async function getItemByID(id: string): Promise<any | null> {
  try {
    const allItems = await Items.getAllItems();
    const foundItem = allItems.find((item: any) => item.id === id);
    return foundItem || null;
  } catch (error) {
    console.error('Erreur lors de la recherche de l’élément par ID:', error);
    throw new Error('Échec de la recherche de l’élément par ID');
  }
}

export async function getResearchByActant(actantId: string) {
  try {
    const recherches = await Items.getRecherches();

    // Filtrer les recherches en fonction du champ creator
    const recherchesFiltrees = recherches.filter((recherche: { creator: string }) => recherche.creator === actantId);

    // Enrichir avec les URLs des médias via l'API Omeka S
    const enrichedRecherches = await Promise.all(
      recherchesFiltrees.map(async (recherche: any) => {
        try {
          // Récupérer les médias de l'item
          const mediaResponse = await fetch(`https://tests.arcanes.ca/omk/api/media?item_id=${recherche.id}`);
          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            if (mediaData && mediaData.length > 0) {
              // Prendre le premier média (l'image de la visualisation)
              const firstMedia = mediaData[0];
              const thumbnailUrl = firstMedia['o:thumbnail_urls']?.square || firstMedia['o:thumbnail_urls']?.medium || firstMedia['o:original_url'];
              return {
                ...recherche,
                imageUrl: thumbnailUrl || null,
              };
            }
          }
        } catch (e) {
          console.warn(`Erreur récupération média pour recherche ${recherche.id}:`, e);
        }
        return { ...recherche, imageUrl: null };
      }),
    );

    return enrichedRecherches;
  } catch (error) {
    console.error('Erreur lors de la récupération des recherches par actant :', error);
    throw new Error('Impossible de récupérer les recherches');
  }
}

/**
 * Créer un commentaire Edisem
 *
 * @param commentaireData - Données du commentaire
 * @returns Promise avec le résultat de la création
 */
export async function createEdisemComment(commentaireData: {
  contenu: string; // Le texte du commentaire
  actantId?: number; // ID de l'actant associé (optionnel)
  relatedResourceId?: number; // ID de la ressource liée (optionnel)
  owner_id: number;
  class_id?: number;
}): Promise<any> {
  try {
    // Utiliser un owner_id temporaire valide (1 = administrateur)
    // TODO: Implémenter la synchronisation des utilisateurs entre les systèmes
    const finalOwnerId = 1;
    // Utiliser le contenu directement comme titre (comme dans votre exemple)
    const titre = commentaireData.contenu;

    // Créer les propriétés du commentaire
    const values: any[] = [
      {
        property_id: 1, // dcterms:title - ENVOYÉ EN PREMIER pour générer o:title
        value: titre,
        type: 'literal',
      },
      {
        property_id: 561, // schema:commentText
        value: commentaireData.contenu,
        type: 'literal',
      },
      {
        property_id: 562, // schema:commentTime
        value: new Date().toISOString(),
        type: 'literal',
      },
    ];

    // Ajouter automatiquement l'actant (l'auteur du commentaire)
    // Pour l'instant, nous devons faire correspondre l'utilisateur local avec une ressource actant
    // TODO: Implémenter la synchronisation des utilisateurs entre les systèmes
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser && currentUser.id) {
      values.push({
        property_id: 2095, // jdc:hasActant
        value_resource_id: parseInt(currentUser.id),
        type: 'resource',
      });
    }

    // Ajouter la ressource liée si fournie (ma:hasRelatedResource)
    if (commentaireData.relatedResourceId) {
      values.push({
        property_id: 1794,
        value_resource_id: commentaireData.relatedResourceId,
        type: 'resource',
      });
    }

    // Préparer les paramètres de requête
    const params = new URLSearchParams({
      helper: 'Query',
      action: 'createResource',
      json: '1',
      template_id: '123',
      owner_id: String(finalOwnerId),
      class_id: String(commentaireData.class_id || ''),
      values: JSON.stringify(values),
    });

    console.log('Sending request params:', params.toString());
    console.log('Final URL:', `https://tests.arcanes.ca/omk/s/edisem/page/ajax?${params.toString()}`);

    const response = await fetch(`https://tests.arcanes.ca/omk/s/edisem/page/ajax?${params.toString()}`, {
      method: 'GET', // Utiliser GET car les paramètres sont dans l'URL
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Raw server response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', responseText);
      throw new Error(`Invalid JSON response from server: ${responseText}`);
    }

    if (!result.success) {
      throw new Error(result.message || 'Erreur lors de la création du commentaire');
    }

    return {
      success: true,
      commentaireId: result.id,
      message: 'Commentaire créé avec succès',
    };
  } catch (error) {
    console.error('Erreur lors de la création du commentaire Edisem:', error);
    throw new Error('Impossible de créer le commentaire');
  }
}

/**
 * Récupérer tous les commentaires Edisem
 *
 * @returns Promise avec la liste des commentaires
 */
export async function getEdisemComments(): Promise<any[]> {
  try {
    const response = await fetch('https://tests.arcanes.ca/omk/s/edisem/page/ajax', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        helper: 'Query',
        action: 'getEdisemComments',
        json: '1',
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();

    if (!result || !Array.isArray(result)) {
      throw new Error('Format de réponse invalide');
    }

    return result;
  } catch (error) {
    console.error('Erreur lors de la récupération des commentaires:', error);
    throw error;
  }
}

/**
 * Récupérer un commentaire Edisem par son ID
 *
 * @param commentaireId - ID du commentaire
 * @returns Promise avec les données du commentaire
 */
export async function getEdisemCommentById(commentaireId: number): Promise<any> {
  try {
    const comments = await getEdisemComments();
    const comment = comments.find((c: any) => c.id === commentaireId);

    if (!comment) {
      throw new Error(`Commentaire avec l'ID ${commentaireId} non trouvé`);
    }

    return comment;
  } catch (error) {
    console.error('Erreur lors de la récupération du commentaire:', error);
    throw error;
  }
}

/**
 * Supprime définitivement un commentaire Edisem (DELETE Omeka S).
 */
export async function deleteEdisemComment(commentaireId: number): Promise<any> {
  try {
    let proxyError: string | undefined;

    try {
      const result = await ApiProxy.deleteItem(commentaireId);

      if (result?.error) {
        proxyError = typeof result.error === 'string' ? result.error : 'Erreur lors de la suppression du commentaire';
      } else if (result?.success === false) {
        proxyError = result.message || 'Erreur lors de la suppression du commentaire';
      } else {
        return { success: true, message: 'Commentaire supprimé avec succès' };
      }
    } catch (error) {
      proxyError = error instanceof Error ? error.message : 'Erreur lors de la suppression du commentaire';
    }

    const response = await fetch(omekaApiUrl(`${OMEKA_API_BASE}items/${commentaireId}`));
    if (response.status === 404) {
      return { success: true, message: 'Commentaire supprimé avec succès' };
    }

    throw new Error(proxyError || 'Erreur lors de la suppression du commentaire');
  } catch (error) {
    console.error('Erreur lors de la suppression du commentaire Edisem:', error);
    throw new Error(error instanceof Error ? error.message : 'Impossible de supprimer le commentaire');
  }
}
