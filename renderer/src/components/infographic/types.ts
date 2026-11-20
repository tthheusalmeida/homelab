import type { LibraryInfographicSection } from '#shared/contracts/library';

/** O que cada modelo de infográfico recebe: a seção (cada modelo usa os seus campos). */
export interface LayoutProps {
  data: LibraryInfographicSection;
}
