/**
 * Service pour l'API de l'espace étudiant
 * Endpoints dédiés pour les ressources étudiantes (expérimentations, outils, feedbacks)
 */

const API_BASE = 'https://tests.arcanes.ca/omk/s/edisem/page/ajax?helper=StudentSpace';

/**
 * Types pour les ressources étudiantes
 */
export interface StudentResourceCard {
  id: number | string;
  title: string;
  thumbnail: string | null;
  type:
    | 'experimentation_etudiant'
    | 'outil_etudiant'
    | 'retour_experience_etudiant'
    | 'experimentation'
    | 'retour_experience'
    | 'outil'
    | 'seminaire'
    | 'recit_scientifique'
    | 'recit_artistique'
    | 'recit_techno_industriel'
    | 'recit_citoyen'
    | 'recit_mediatique'
    | 'annotation'
    | 'element_esthetique'
    | 'element_narratif'
    | 'bibliographie';
  actants: {
    id: number | string;
    title: string;
    picture: string | null;
  }[];
  created?: string;
}

export interface AllStudentResources {
  experimentations: StudentResourceCard[];
  tools: StudentResourceCard[];
  feedbacks: StudentResourceCard[];
  total: number;
}

export interface StudentResourceDetails {
  id: number;
  title: string;
  type: 'experimentation_etudiant' | 'outil_etudiant' | 'retour_experience_etudiant';
  resource_template_id: number;
  created: string;
  modified: string;
  owner_id: number;
  values: Record<string, any[]>;
  media: {
    id: number;
    storage_id: string;
    media_type: string;
    source: string;
    url: string;
    thumbnail: string;
  }[];
  actants: {
    id: number;
    title: string;
    picture: string | null;
    role: string;
  }[];
}

export interface TemplateProperty {
  property_id: number;
  term: string;
  local_name: string;
  is_required: boolean;
  alternate_label: string | null;
  alternate_comment: string | null;
}

/**
 * Type pour un étudiant avec son ID utilisateur Omeka S
 */
export interface Student {
  id: number;
  firstname: string;
  lastname: string;
  title: string;
  mail: string;
  studentNumber: string; // Numéro étudiant (dcterms:identifier)
  classNumber: string; // Numéro de classe (schema:courseCode)
  picture: string | null;
  omekaUserId: number | null; // ID utilisateur Omeka S (table user)
  type: 'student';
}

/**
 * Récupère toutes les ressources étudiantes (expérimentations, outils, feedbacks)
 * Format simplifié pour les cards
 */
export async function getAllStudentResources(): Promise<AllStudentResources> {
  try {
    const response = await fetch(`${API_BASE}&action=getAllResources&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des ressources');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching student resources:', error);
    throw error;
  }
}

/**
 * Récupère les ressources créées par un utilisateur spécifique
 * Retourne un tableau plat filtré par owner_id côté backend
 */
export async function getUserResources(userId: number): Promise<StudentResourceCard[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getUserResources&userId=${userId}&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des ressources utilisateur');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user resources:', error);
    throw error;
  }
}

/**
 * Récupère les expérimentations étudiantes (format card)
 */
export async function getStudentExperimentations(): Promise<StudentResourceCard[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getExperimentations&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des expérimentations');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching student experimentations:', error);
    throw error;
  }
}

/**
 * Récupère les outils (format card)
 */
export async function getStudentTools(): Promise<StudentResourceCard[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getTools&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des outils');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching student tools:', error);
    throw error;
  }
}

/**
 * Récupère les feedbacks (format card)
 */
export async function getStudentFeedbacks(): Promise<StudentResourceCard[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getFeedbacks&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des feedbacks');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching student feedbacks:', error);
    throw error;
  }
}

/**
 * Récupère les détails complets d'une ressource
 */
export async function getStudentResourceDetails(id: number): Promise<StudentResourceDetails> {
  try {
    const response = await fetch(`${API_BASE}&action=getResourceDetails&id=${id}&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des détails');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching resource details:', error);
    throw error;
  }
}

/**
 * Récupère les propriétés d'un template (pour les formulaires de création/édition)
 */
export async function getStudentTemplateProperties(templateId: number): Promise<{
  templateId: number;
  properties: TemplateProperty[];
}> {
  try {
    const response = await fetch(`${API_BASE}&action=getTemplateProperties&templateId=${templateId}&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des propriétés');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching template properties:', error);
    throw error;
  }
}

/**
 * Récupère les étudiants avec leur ID utilisateur Omeka S
 * Utilisé pour le login et pour déterminer le owner lors de la création de ressources
 */
export async function getStudentsForLogin(): Promise<Student[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getStudents&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des étudiants');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
}

// ========== COURSE TYPES & FUNCTIONS ==========

/**
 * Type pour un cours
 */
export interface Course {
  id: number;
  title: string;
  description: string;
  code: string; // Code du cours (ex: ART2030)
  level: string; // Niveau (Baccalauréat, Maîtrise, etc.)
  session: string; // Session (Automne, Hiver, Été)
  year: string; // Année
  studentCount: number; // Nombre d'étudiants inscrits
  created?: string;
  modified?: string;
}

/**
 * Type pour les données de création/modification d'un cours
 */
export interface CourseFormData {
  title: string;
  description?: string;
  code?: string;
  level?: string;
  session?: string;
  year?: string;
}

/**
 * Récupère tous les cours
 */
export async function getCourses(): Promise<Course[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getCourses&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des cours');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
}

/**
 * Créer un cours
 */
export async function createCourse(data: CourseFormData): Promise<{ success: boolean; id: number }> {
  const params = new URLSearchParams({
    title: data.title,
    description: data.description || '',
    code: data.code || '',
    level: data.level || '',
    session: data.session || '',
    year: data.year || '',
  });

  const response = await fetch(`${API_BASE}&action=createCourse&json=1&${params.toString()}`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Mettre à jour un cours
 */
export async function updateCourse(id: number, data: Partial<CourseFormData>): Promise<{ success: boolean; id: number }> {
  const params = new URLSearchParams({ id: String(id) });

  if (data.title !== undefined) params.append('title', data.title);
  if (data.description !== undefined) params.append('description', data.description);
  if (data.code !== undefined) params.append('code', data.code);
  if (data.level !== undefined) params.append('level', data.level);
  if (data.session !== undefined) params.append('session', data.session);
  if (data.year !== undefined) params.append('year', data.year);

  const response = await fetch(`${API_BASE}&action=updateCourse&json=1&${params.toString()}`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Supprimer un cours
 */
export async function deleteCourse(id: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}&action=deleteCourse&id=${id}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Inscrire un étudiant à un cours
 */
export async function enrollStudent(studentId: number, courseId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}&action=enrollStudent&studentId=${studentId}&courseId=${courseId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Désinscrire un étudiant d'un cours
 */
export async function unenrollStudent(studentId: number, courseId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}&action=unenrollStudent&studentId=${studentId}&courseId=${courseId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les cours d'un étudiant
 */
export async function getStudentCourses(studentId: number): Promise<Course[]> {
  const response = await fetch(`${API_BASE}&action=getStudentCourses&studentId=${studentId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les étudiants d'un cours
 */
export async function getCourseStudents(courseId: number): Promise<Student[]> {
  const response = await fetch(`${API_BASE}&action=getCourseStudents&courseId=${courseId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les ressources filtrées par cours
 */
export async function getResourcesByCourse(courseId: number): Promise<AllStudentResources> {
  const response = await fetch(`${API_BASE}&action=getResourcesByCourse&courseId=${courseId}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les expérimentations du même cours qu'une expérimentation donnée
 * Pour les recommandations "Expérimentations similaires"
 */
export async function getSameCourseExperimentations(experimentationId: number, limit: number = 4): Promise<StudentResourceCard[]> {
  const response = await fetch(`${API_BASE}&action=getSameCourseExperimentations&experimentationId=${experimentationId}&limit=${limit}&json=1`);
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return Array.isArray(result) ? result : [];
}

// ========== RESEARCH PROJECT (SAVED SEARCHES) ==========

/**
 * Template ID pour les projets de recherche (recherches sauvegardées)
 */
export const RESEARCH_TEMPLATE_ID = 102;

/**
 * Property IDs pour le template ResearchProject
 */
const RESEARCH_PROPERTIES = {
  title: 1, // dcterms:title
  creator: 2, // dcterms:creator
  codeRepository: 551, // schema:codeRepository (stocke le JSON des filtres)
} as const;

/**
 * Type pour une recherche sauvegardée
 */
export interface SavedResearch {
  id: number;
  title: string;
  config: string; // JSON stringifié des FilterGroup[]
  created: string;
  creatorId?: number;
}

/**
 * Convertit un dataURL en File
 */
function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Sauvegarde une recherche dans Omeka S
 * Crée un item ResearchProject avec la configuration de recherche et l'image de la visualisation
 */
export async function saveResearch(title: string, filterGroups: any, imageDataUrl?: string): Promise<{ success: boolean; id: number }> {
  // Récupérer les IDs utilisateur depuis localStorage
  const userId = localStorage.getItem('userId');
  const omekaUserId = localStorage.getItem('omekaUserId');

  if (!userId || !omekaUserId) {
    throw new Error('Utilisateur non connecté. Veuillez vous connecter pour sauvegarder une recherche.');
  }

  const configJson = JSON.stringify(filterGroups);

  // Construire l'objet pour l'API Omeka S
  const itemData: Record<string, any> = {
    'o:resource_template': { 'o:id': RESEARCH_TEMPLATE_ID },
    'o:owner': { 'o:id': parseInt(omekaUserId, 10) },
    'dcterms:title': [
      {
        type: 'literal',
        property_id: RESEARCH_PROPERTIES.title,
        '@value': title,
        is_public: true,
      },
    ],
    'dcterms:creator': [
      {
        type: 'resource',
        property_id: RESEARCH_PROPERTIES.creator,
        value_resource_id: parseInt(userId, 10),
        is_public: true,
      },
    ],
    'schema:codeRepository': [
      {
        type: 'literal',
        property_id: RESEARCH_PROPERTIES.codeRepository,
        '@value': configJson,
        is_public: true,
      },
    ],
  };

  // Utiliser les credentials depuis les variables d'environnement
  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_IDENT = 'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';
  const createUrl = `https://tests.arcanes.ca/omk/api/items?key_identity=${API_IDENT}&key_credential=${API_KEY}`;

  const response = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Erreur création recherche:', errorData);
    throw new Error(errorData['o:errors']?.join(', ') || 'Erreur lors de la sauvegarde de la recherche');
  }

  const result = await response.json();
  const newItemId = result['o:id'];

  // Upload de l'image comme média si fournie
  if (imageDataUrl && newItemId) {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
      const filename = `recherche_${timestamp}.png`;
      const imageFile = dataURLtoFile(imageDataUrl, filename);

      const formData = new FormData();
      formData.append(
        'data',
        JSON.stringify({
          'o:ingester': 'upload',
          'o:item': { 'o:id': newItemId },
          file_index: '0',
        }),
      );
      formData.append('file[0]', imageFile);

      const mediaUrl = `https://tests.arcanes.ca/omk/api/media?key_identity=${API_IDENT}&key_credential=${API_KEY}`;
      const mediaResponse = await fetch(mediaUrl, {
        method: 'POST',
        body: formData,
      });

      if (!mediaResponse.ok) {
        console.error('Erreur upload média:', await mediaResponse.text());
      } else {
        console.log('Image de recherche uploadée avec succès');
      }
    } catch (err) {
      console.error('Erreur upload média:', err);
    }
  }

  return { success: true, id: newItemId };
}

/**
 * Récupère les recherches sauvegardées de l'utilisateur connecté
 */
export async function getUserSavedResearches(): Promise<SavedResearch[]> {
  const omekaUserId = localStorage.getItem('omekaUserId');

  if (!omekaUserId) {
    return [];
  }

  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_IDENT = 'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';
  const url = `https://tests.arcanes.ca/omk/api/items?resource_template_id=${RESEARCH_TEMPLATE_ID}&owner_id=${omekaUserId}&key_identity=${API_IDENT}&key_credential=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Erreur récupération recherches:', response.statusText);
      return [];
    }

    const items = await response.json();

    return items.map((item: any) => ({
      id: item['o:id'],
      title: item['o:title'] || 'Sans titre',
      config: item['schema:codeRepository']?.[0]?.['@value'] || '[]',
      created: item['o:created']?.['@value'] || '',
      creatorId: item['dcterms:creator']?.[0]?.['value_resource_id'],
    }));
  } catch (error) {
    console.error('Erreur récupération recherches:', error);
    return [];
  }
}

/**
 * Supprime une recherche sauvegardée
 */
export async function deleteResearch(id: number): Promise<{ success: boolean }> {
  const API_KEY = import.meta.env.VITE_API_KEY;
  const API_IDENT = 'NUO2yCjiugeH7XbqwUcKskhE8kXg0rUj';
  const url = `https://tests.arcanes.ca/omk/api/items/${id}?key_identity=${API_IDENT}&key_credential=${API_KEY}`;

  const response = await fetch(url, { method: 'DELETE' });

  if (!response.ok) {
    throw new Error('Erreur lors de la suppression de la recherche');
  }

  return { success: true };
}

// ========== ACTANT TYPES & FUNCTIONS ==========

/**
 * Type pour un actant (item template 72) avec sa liaison utilisateur Omeka S
 */
export interface Actant {
  id: number; // ID de l'item actant (template 72)
  omekaUserId: number | null; // ID utilisateur Omeka S (null si non lié)
  omekaUserName: string | null; // Nom de l'utilisateur Omeka S
  omekaUserRole: string | null; // Rôle de l'utilisateur Omeka S
  mail: string;
  firstname: string;
  lastname: string;
  title: string;
  picture: string | null;
  created?: string;
  type: 'actant';
}

/**
 * Récupère les actants avec leur omekaUserId
 * Les actants sont les utilisateurs avec un rôle admin/author dans Omeka S
 */
export async function getActantsForLogin(): Promise<Actant[]> {
  try {
    const response = await fetch(`${API_BASE}&action=getActants&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des actants');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching actants:', error);
    throw error;
  }
}

/**
 * Lier un actant (item) à un utilisateur Omeka S
 */
export async function linkActantToUser(actantId: number, userId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}&action=linkActantToUser&actantId=${actantId}&userId=${userId}&json=1`, {
    method: 'POST',
  });
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Créer un utilisateur Omeka S pour un actant et le lier automatiquement
 */
export async function createOmekaUserForActant(
  actantId: number,
  email: string,
  name: string,
  role: string = 'author',
): Promise<{ success: boolean; userId: number; actantId: number }> {
  const params = new URLSearchParams({
    actantId: String(actantId),
    email,
    name,
    role,
  });

  const response = await fetch(`${API_BASE}&action=createOmekaUserForActant&json=1&${params.toString()}`, {
    method: 'POST',
  });
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Supprimer un actant (et optionnellement son utilisateur Omeka S)
 */
export async function deleteActant(actantId: number, deleteUser: boolean = false): Promise<{ success: boolean; actantId: number; actantTitle: string; userDeleted: boolean }> {
  const params = new URLSearchParams({
    actantId: String(actantId),
    deleteUser: String(deleteUser),
  });

  const response = await fetch(`${API_BASE}&action=deleteActant&json=1&${params.toString()}`, {
    method: 'POST',
  });
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Créer un actant avec son utilisateur Omeka S (pour import batch)
 */
export async function createActantWithUser(
  email: string,
  name: string,
  role: string = 'author',
): Promise<{ success: boolean; userId: number; actantId: number; email: string; name: string; role: string }> {
  const params = new URLSearchParams({
    email,
    name,
    role,
  });

  const response = await fetch(`${API_BASE}&action=createActantWithUser&json=1&${params.toString()}`, {
    method: 'POST',
  });
  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Récupérer les ressources enseignantes (créées par les actants, visibles par tous)
 */
export async function getTeacherResources(): Promise<AllStudentResources> {
  try {
    const response = await fetch(`${API_BASE}&action=getTeacherResources&json=1`);

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des ressources enseignantes');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching teacher resources:', error);
    throw error;
  }
}
