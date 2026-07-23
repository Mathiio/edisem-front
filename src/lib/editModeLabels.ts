/**
 * Libellé court pour les boutons d'ajout en mode édition : icône + « Mot-clé », « Personne », etc.
 * Retire le préfixe « Ajouter » et les articles indéfinis éventuels.
 */
export function formatEditAddButtonLabel(rawLabel?: string | null): string {
  if (!rawLabel?.trim()) return '';
  let label = rawLabel.trim();
  label = label.replace(/^ajouter\s+(?:(?:un|une|des|le|la|les)\s+)?/i, '');
  if (!label) return rawLabel.trim();
  return label.charAt(0).toUpperCase() + label.slice(1);
}
