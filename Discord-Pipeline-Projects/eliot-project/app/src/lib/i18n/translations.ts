/**
 * Translation strings for LarvalBase i18n.
 * Supports English (en) and French (fr).
 */

export type Language = 'en' | 'fr' | 'es' | 'pt' | 'de' | 'ja' | 'zh' | 'hi' | 'ar' | 'ru';

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Fran\u00E7ais', flag: '🇫🇷' },
  { code: 'es', label: 'Espa\u00F1ol', flag: '🇪🇸' },
  { code: 'pt', label: 'Portugu\u00EAs', flag: '🇧🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', label: '\u65E5\u672C\u8A9E', flag: '🇯🇵' },
  { code: 'zh', label: '\u7B80\u4F53\u4E2D\u6587', flag: '🇨🇳' },
  { code: 'hi', label: '\u0939\u093F\u0928\u094D\u0926\u0940', flag: '🇮🇳' },
  { code: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', flag: '🇸🇦' },
  { code: 'ru', label: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', flag: '🇷🇺' },
];

type TranslationStrings = {
  // Homepage
  homepage_title: string;
  homepage_credits: string;
  homepage_description_1: string;
  homepage_description_2: string;
  homepage_description_3: string;
  homepage_cite: string;
  gallery_button: string;
  back_to_homepage: string;
  back_to_gallery: string;
  back_to_family_gallery: string;

  // Navigation / Sidebar
  search_placeholder: string;
  filter_by_trait: string;
  filter_by_province: string;
  biogeographic_province: string;
  all_species: string;

  // Species header
  common_name: string;
  records: string;
  record: string;
  studies: string;
  study: string;
  picture_source: string;
  identification_certainty: string;
  sure: string;
  unsure: string;
  specimen_length: string;
  size_scale_available: string;
  size_scale_unavailable: string;
  distribution_title: string;
  contact_email: string;

  // Section titles
  section_egg: string;
  section_hatching: string;
  section_flexion: string;
  section_metamorphosis: string;
  section_settlement: string;
  section_vertical: string;
  section_swimming: string;
  section_pelagic_juvenile: string;
  section_rafting: string;
  section_larval_growth: string;
  section_images: string;
  section_references: string;

  // Trait names
  trait_egg_diameter: string;
  trait_egg_width: string;
  trait_egg_volume: string;
  trait_yolk_diameter: string;
  trait_oil_globule_size: string;
  trait_incubation_duration: string;
  trait_hatching_size: string;
  trait_first_feeding_age: string;
  trait_first_feeding_size: string;
  trait_yolk_absorption_age: string;
  trait_yolk_absorbed_size: string;
  trait_flexion_age: string;
  trait_flexion_size: string;
  trait_metamorphosis_age: string;
  trait_metamorphosis_duration: string;
  trait_metamorphosis_size: string;
  trait_settlement_age: string;
  trait_settlement_size: string;
  trait_critical_swimming_speed: string;
  trait_critical_swimming_speed_rel: string;
  trait_in_situ_swimming_speed: string;
  trait_in_situ_swimming_speed_rel: string;
  trait_vertical_day_depth: string;
  trait_vertical_night_depth: string;
  trait_vertical_distribution: string;

  // Comparison barplots
  genus_comparison: string;
  family_comparison: string;
  order_comparison: string;
  show_comparisons: string;
  hide_comparisons: string;
  genus_average: string;
  family_average: string;
  order_average: string;
  no_known_values: string;

  // Species detail misc
  source_year: string;
  colored_pictures_button: string;

  // Province map
  province_map_title: string;
  species_percentage: string;
  families_percentage: string;
  larvalbase_species: string;
  total_marine_species: string;

  // Gallery page
  families_gallery: string;
  species_with_images: string;

  // Barplot stats
  taxa_per_trait: string;
  publication_year: string;

  // Settlement map
  settlement_map_title: string;

  // Footer / source
  source_label: string;
};

const en: TranslationStrings = {
  // Homepage
  homepage_title: 'LarvalBase: Global pelagic dispersal traits databases for early-life stages of marine fishes \u2013 Ruiz et al. (2026)',
  homepage_credits: 'Editor & Manager: Eliot Ruiz / Developer: Anthony Hunt',
  homepage_description_1: 'To support research on the early life stages of marine fishes, we compiled a comprehensive database of 35 traits (7 qualitative and 28 quantitative) describing developmental, behavioral, and ecological aspects of the pelagic phase. We focused on traits most relevant to pelagic dispersal processes and the parameterization of biophysical dispersal models. The database includes 471 new records on age and size at settlement, including 207 previously unpublished entries and 264 newly acquired during two fieldworks in the Atlantic and Indian Oceans. These fieldworks also allowed obtaining 41 new measurements of swimming performance in situ (see: ',
  homepage_description_2: '). Behavioral databases were completed by 907 previously unpublished records of larval fish vertical position in the water column. Considered together, dispersal traits datasets comprise 47,132 records across 6,874 marine fish species, representing 1,932 genera, 358 families, and 58 orders, sourced from 3,201 references.',
  homepage_description_3: 'LarvalBase was further enriched by an additional 9,357 colored pictures of post-flexion and early juveniles of 1,929 species obtained from 196 sources. Various growth rate models from 47 original references and 90 populations are also now newly displayed, along with age-at-length data. Finally, expert-based distribution areas (IUCN or literature analyses) or curated occurrences (OBIS, GBIF, VertNet, iDigBio and iNaturalist) of adults, depending on availability, were acquired for 17,279 marine fish species, to allow filtering families, genera and species by Marine Ecoregions (Spalding et al., 2007) or Pelagic Provinces (Spalding et al., 2012) of the world.',
  homepage_cite: 'Please cite both the original reference and our data paper, which describes in further detail this new database and method, if you use any part of our database: ',
  gallery_button: 'Colored pictures of post-flexion and early juvenile stages library',
  back_to_homepage: 'Back to homepage',
  back_to_gallery: 'Back to main gallery',
  back_to_family_gallery: 'Back to families gallery',

  // Navigation
  search_placeholder: 'Search species, genus, or family...',
  filter_by_trait: 'Filter by trait',
  filter_by_province: 'Filter by province',
  biogeographic_province: 'Biogeographic province',
  all_species: 'All species',

  // Species header
  common_name: 'Common name',
  records: 'records',
  record: 'record',
  studies: 'studies',
  study: 'study',
  picture_source: 'Picture source',
  identification_certainty: 'Identification certainty',
  sure: 'Sure',
  unsure: 'Unsure',
  specimen_length: 'Specimen length',
  size_scale_available: 'Size/scale available',
  size_scale_unavailable: 'Size/scale unavailable',
  distribution_title: 'Distribution of adults in Marine Ecoregions (MEOW) and Pelagic Provinces (PPOW)',
  contact_email: 'Please send an email to {email} if you are aware of any error or missing records, or if one of the images displayed is yours and you would like it to be removed from this website.',

  // Section titles
  section_egg: 'Egg & Incubation',
  section_hatching: 'Hatching & Pre-flexion Stage',
  section_flexion: 'Flexion Stage',
  section_metamorphosis: 'Metamorphosis',
  section_settlement: 'Settlement',
  section_vertical: 'Vertical Position',
  section_swimming: 'Swimming Speed',
  section_pelagic_juvenile: 'Pelagic Juvenile',
  section_rafting: 'Rafting',
  section_larval_growth: 'Larval Growth',
  section_images: 'Images',
  section_references: 'References',

  // Trait names
  trait_egg_diameter: 'Egg Length',
  trait_egg_width: 'Egg Width',
  trait_egg_volume: 'Egg Volume',
  trait_yolk_diameter: 'Yolk Diameter',
  trait_oil_globule_size: 'Oil Globule Size',
  trait_incubation_duration: 'Incubation Duration',
  trait_hatching_size: 'Hatching Size',
  trait_first_feeding_age: 'First Feeding Age',
  trait_first_feeding_size: 'First Feeding Size',
  trait_yolk_absorption_age: 'Yolk Absorption Age',
  trait_yolk_absorbed_size: 'Yolk Absorbed Size',
  trait_flexion_age: 'Flexion Age',
  trait_flexion_size: 'Flexion Size',
  trait_metamorphosis_age: 'Metamorphosis Age',
  trait_metamorphosis_duration: 'Metamorphosis Duration',
  trait_metamorphosis_size: 'Metamorphosis Size',
  trait_settlement_age: 'Settlement Age',
  trait_settlement_size: 'Settlement Size',
  trait_critical_swimming_speed: 'Critical Swimming Speed (Absolute)',
  trait_critical_swimming_speed_rel: 'Critical Swimming Speed (Relative)',
  trait_in_situ_swimming_speed: 'In Situ Swimming Speed (Absolute)',
  trait_in_situ_swimming_speed_rel: 'In Situ Swimming Speed (Relative)',
  trait_vertical_day_depth: 'Day Depth',
  trait_vertical_night_depth: 'Night Depth',
  trait_vertical_distribution: 'Vertical Distribution',

  // Comparison
  genus_comparison: 'Genus Comparison',
  family_comparison: 'Family Comparison',
  order_comparison: 'Order Comparison',
  show_comparisons: 'Show comparisons between taxa',
  hide_comparisons: 'Hide comparisons',
  genus_average: 'Genus average',
  family_average: 'Family average',
  order_average: 'Order average',
  no_known_values: 'No known values',

  // Species detail
  source_year: 'Source (2026)',
  colored_pictures_button: 'Colored pictures of post-flexion and early juvenile stages',

  // Province map
  province_map_title: 'Distribution in biogeographic provinces',
  species_percentage: '% of species in LarvalBase',
  families_percentage: '% of families in LarvalBase',
  larvalbase_species: 'LarvalBase species',
  total_marine_species: 'Total marine species',

  // Gallery
  families_gallery: 'Families Gallery',
  species_with_images: 'species with images',

  // Barplots
  taxa_per_trait: 'Taxa per trait',
  publication_year: 'Publications by year',

  // Settlement map
  settlement_map_title: 'Settlement-stage sampling locations',

  // Source
  source_label: 'Source',
};

const fr: TranslationStrings = {
  // Homepage
  homepage_title: 'LarvalBase\u00A0: Bases de donn\u00E9es mondiales des traits de dispersion p\u00E9lagique pour les stades pr\u00E9coces de poissons marins \u2013 Ruiz et al. (2026)',
  homepage_credits: '\u00C9diteur & Gestionnaire\u00A0: Eliot Ruiz / D\u00E9veloppeur\u00A0: Anthony Hunt',
  homepage_description_1: 'Pour soutenir la recherche sur les stades pr\u00E9coces des poissons marins, nous avons compil\u00E9 une base de donn\u00E9es compl\u00E8te de 35 traits (7 qualitatifs et 28 quantitatifs) d\u00E9crivant les aspects d\u00E9veloppementaux, comportementaux et \u00E9cologiques de la phase p\u00E9lagique. Nous nous sommes concentr\u00E9s sur les traits les plus pertinents pour les processus de dispersion p\u00E9lagique et la param\u00E9trisation des mod\u00E8les de dispersion biophysique. La base de donn\u00E9es comprend 471 nouveaux enregistrements sur l\'\u00E2ge et la taille \u00E0 l\'\u00E9tablissement, dont 207 entr\u00E9es pr\u00E9c\u00E9demment in\u00E9dites et 264 nouvellement acquises lors de deux campagnes de terrain dans les oc\u00E9ans Atlantique et Indien. Ces campagnes ont \u00E9galement permis d\'obtenir 41 nouvelles mesures de performance de nage in situ (voir\u00A0: ',
  homepage_description_2: '). Les bases de donn\u00E9es comportementales ont \u00E9t\u00E9 compl\u00E9t\u00E9es par 907 enregistrements in\u00E9dits de la position verticale des larves de poissons dans la colonne d\'eau. Consid\u00E9r\u00E9s ensemble, les jeux de donn\u00E9es de traits de dispersion comprennent 47\u00A0132 enregistrements pour 6\u00A0874 esp\u00E8ces de poissons marins, repr\u00E9sentant 1\u00A0932 genres, 358 familles et 58 ordres, provenant de 3\u00A0201 r\u00E9f\u00E9rences.',
  homepage_description_3: 'LarvalBase a \u00E9t\u00E9 enrichie par 9\u00A0357 photographies couleur suppl\u00E9mentaires de stades post-flexion et juv\u00E9niles pr\u00E9coces de 1\u00A0929 esp\u00E8ces, obtenues \u00E0 partir de 196 sources. Divers mod\u00E8les de taux de croissance issus de 47 r\u00E9f\u00E9rences originales et 90 populations sont d\u00E9sormais affich\u00E9s, ainsi que les donn\u00E9es \u00E2ge-longueur. Enfin, les aires de distribution bas\u00E9es sur des expertises (UICN ou analyses bibliographiques) ou des occurrences v\u00E9rifi\u00E9es (OBIS, GBIF, VertNet, iDigBio et iNaturalist) d\'adultes, selon la disponibilit\u00E9, ont \u00E9t\u00E9 acquises pour 17\u00A0279 esp\u00E8ces de poissons marins, permettant de filtrer familles, genres et esp\u00E8ces par \u00E9cor\u00E9gions marines (Spalding et al., 2007) ou provinces p\u00E9lagiques (Spalding et al., 2012) du monde.',
  homepage_cite: 'Veuillez citer \u00E0 la fois la r\u00E9f\u00E9rence originale et notre article de donn\u00E9es, qui d\u00E9crit plus en d\u00E9tail cette nouvelle base de donn\u00E9es et m\u00E9thode, si vous utilisez une partie de notre base de donn\u00E9es\u00A0: ',
  gallery_button: 'Phototh\u00E8que d\'images couleur des stades post-flexion et juv\u00E9niles pr\u00E9coces',
  back_to_homepage: 'Retour \u00E0 l\'accueil',
  back_to_gallery: 'Retour \u00E0 la galerie principale',
  back_to_family_gallery: 'Retour \u00E0 la galerie des familles',

  // Navigation
  search_placeholder: 'Rechercher une esp\u00E8ce, un genre ou une famille...',
  filter_by_trait: 'Filtrer par trait',
  filter_by_province: 'Filtrer par province',
  biogeographic_province: 'Province biog\u00E9ographique',
  all_species: 'Toutes les esp\u00E8ces',

  // Species header
  common_name: 'Nom commun',
  records: 'enregistrements',
  record: 'enregistrement',
  studies: '\u00E9tudes',
  study: '\u00E9tude',
  picture_source: 'Source de l\'image',
  identification_certainty: 'Certitude d\'identification',
  sure: 'S\u00FBre',
  unsure: 'Incertaine',
  specimen_length: 'Taille du sp\u00E9cimen',
  size_scale_available: '\u00C9chelle disponible',
  size_scale_unavailable: '\u00C9chelle non disponible',
  distribution_title: 'Distribution des adultes dans les \u00C9cor\u00E9gions Marines (MEOW) et les Provinces P\u00E9lagiques (PPOW)',
  contact_email: 'Veuillez envoyer un email \u00E0 {email} si vous \u00EAtes au courant d\'une erreur ou d\'enregistrements manquants, ou si l\'une des images affich\u00E9es est la v\u00F4tre et que vous souhaitez la retirer de ce site.',

  // Section titles
  section_egg: '\u0152uf & Incubation',
  section_hatching: '\u00C9closion & Stade pr\u00E9-flexion',
  section_flexion: 'Stade de flexion',
  section_metamorphosis: 'M\u00E9tamorphose',
  section_settlement: '\u00C9tablissement',
  section_vertical: 'Position verticale',
  section_swimming: 'Vitesse de nage',
  section_pelagic_juvenile: 'Juv\u00E9nile p\u00E9lagique',
  section_rafting: 'Rafting',
  section_larval_growth: 'Croissance larvaire',
  section_images: 'Images',
  section_references: 'R\u00E9f\u00E9rences',

  // Trait names
  trait_egg_diameter: 'Longueur de l\'\u0153uf',
  trait_egg_width: 'Largeur de l\'\u0153uf',
  trait_egg_volume: 'Volume de l\'\u0153uf',
  trait_yolk_diameter: 'Diam\u00E8tre du vitellus',
  trait_oil_globule_size: 'Taille du globule lipidique',
  trait_incubation_duration: 'Dur\u00E9e d\'incubation',
  trait_hatching_size: 'Taille \u00E0 l\'\u00E9closion',
  trait_first_feeding_age: '\u00C2ge de premi\u00E8re alimentation',
  trait_first_feeding_size: 'Taille de premi\u00E8re alimentation',
  trait_yolk_absorption_age: '\u00C2ge d\'absorption du vitellus',
  trait_yolk_absorbed_size: 'Taille d\'absorption du vitellus',
  trait_flexion_age: '\u00C2ge de flexion',
  trait_flexion_size: 'Taille de flexion',
  trait_metamorphosis_age: '\u00C2ge de m\u00E9tamorphose',
  trait_metamorphosis_duration: 'Dur\u00E9e de m\u00E9tamorphose',
  trait_metamorphosis_size: 'Taille de m\u00E9tamorphose',
  trait_settlement_age: '\u00C2ge d\'\u00E9tablissement',
  trait_settlement_size: 'Taille d\'\u00E9tablissement',
  trait_critical_swimming_speed: 'Vitesse de nage critique (Absolue)',
  trait_critical_swimming_speed_rel: 'Vitesse de nage critique (Relative)',
  trait_in_situ_swimming_speed: 'Vitesse de nage in situ (Absolue)',
  trait_in_situ_swimming_speed_rel: 'Vitesse de nage in situ (Relative)',
  trait_vertical_day_depth: 'Profondeur de jour',
  trait_vertical_night_depth: 'Profondeur de nuit',
  trait_vertical_distribution: 'Distribution verticale',

  // Comparison
  genus_comparison: 'Comparaison par genre',
  family_comparison: 'Comparaison par famille',
  order_comparison: 'Comparaison par ordre',
  show_comparisons: 'Afficher les comparaisons entre taxons',
  hide_comparisons: 'Masquer les comparaisons',
  genus_average: 'Moyenne du genre',
  family_average: 'Moyenne de la famille',
  order_average: 'Moyenne de l\'ordre',
  no_known_values: 'Aucune valeur connue',

  // Species detail
  source_year: 'Source (2026)',
  colored_pictures_button: 'Images couleur des stades post-flexion et juv\u00E9niles pr\u00E9coces',

  // Province map
  province_map_title: 'Distribution dans les provinces biog\u00E9ographiques',
  species_percentage: '% d\'esp\u00E8ces dans LarvalBase',
  families_percentage: '% de familles dans LarvalBase',
  larvalbase_species: 'Esp\u00E8ces LarvalBase',
  total_marine_species: 'Total esp\u00E8ces marines',

  // Gallery
  families_gallery: 'Galerie des familles',
  species_with_images: 'esp\u00E8ces avec images',

  // Barplots
  taxa_per_trait: 'Taxons par trait',
  publication_year: 'Publications par ann\u00E9e',

  // Settlement map
  settlement_map_title: 'Localit\u00E9s d\'\u00E9chantillonnage au stade d\'\u00E9tablissement',

  // Source
  source_label: 'Source',
};

export const translations: Record<Language, TranslationStrings> = { en, fr, es: en, pt: en, de: en, ja: en, zh: en, hi: en, ar: en, ru: en };

/** Section title mapping for i18n (English title -> translation key) */
export const SECTION_TITLE_KEYS: Record<string, keyof TranslationStrings> = {
  'Egg & Incubation': 'section_egg',
  'Hatching & Pre-flexion Stage': 'section_hatching',
  'Flexion Stage': 'section_flexion',
  'Metamorphosis': 'section_metamorphosis',
  'Settlement': 'section_settlement',
  'Vertical Position': 'section_vertical',
  'Swimming Speed': 'section_swimming',
  'Pelagic Juvenile': 'section_pelagic_juvenile',
  'Rafting': 'section_rafting',
  'Larval Growth': 'section_larval_growth',
  'Images': 'section_images',
  'References': 'section_references',
};

/** Trait key -> translation key mapping */
export const TRAIT_NAME_KEYS: Record<string, keyof TranslationStrings> = {
  egg_diameter: 'trait_egg_diameter',
  egg_width: 'trait_egg_width',
  egg_volume: 'trait_egg_volume',
  yolk_diameter: 'trait_yolk_diameter',
  oil_globule_size: 'trait_oil_globule_size',
  incubation_duration: 'trait_incubation_duration',
  hatching_size: 'trait_hatching_size',
  first_feeding_age: 'trait_first_feeding_age',
  first_feeding_size: 'trait_first_feeding_size',
  yolk_absorption_age: 'trait_yolk_absorption_age',
  yolk_absorbed_size: 'trait_yolk_absorbed_size',
  flexion_age: 'trait_flexion_age',
  flexion_size: 'trait_flexion_size',
  metamorphosis_age: 'trait_metamorphosis_age',
  metamorphosis_duration: 'trait_metamorphosis_duration',
  metamorphosis_size: 'trait_metamorphosis_size',
  settlement_age: 'trait_settlement_age',
  settlement_size: 'trait_settlement_size',
  critical_swimming_speed: 'trait_critical_swimming_speed',
  critical_swimming_speed_rel: 'trait_critical_swimming_speed_rel',
  in_situ_swimming_speed: 'trait_in_situ_swimming_speed',
  in_situ_swimming_speed_rel: 'trait_in_situ_swimming_speed_rel',
  vertical_day_depth: 'trait_vertical_day_depth',
  vertical_night_depth: 'trait_vertical_night_depth',
  vertical_distribution: 'trait_vertical_distribution',
};

/** Section tooltip translations */
export const SECTION_TOOLTIP_TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    'Egg & Incubation': 'Characteristics of the egg including its position in the water column, shape, size, and volume. Also includes information about the yolk and oil globule(s) inside the egg, and the duration of egg incubation or gestation.',
    'Hatching & Pre-flexion Stage': 'Size of larvae at hatching or parturition, timing and size at first feeding (start of exogenous nutrition), and yolk-sac absorption (complete depletion of egg resources).',
    'Flexion Stage': 'Timing and size of notochord flexion \u2014 the upward bending of the notochord associated with the ossification of caudal fin elements. This is a key developmental milestone in larval fish development.',
    'Metamorphosis': 'Timing, duration, and size at metamorphosis \u2014 the transition from larval to juvenile stage, often characterized by the appearance of scales, growth of all fin spines/rays, and changes in body proportions.',
    'Settlement': 'Age and size at which larvae transition from pelagic to benthic/demersal life (settlement). This marks the end of the pelagic larval duration (PLD).',
    'Vertical Position': 'Position of larvae in the water column, important for understanding dispersal patterns as different depths experience different current regimes.',
    'Swimming Speed': 'Swimming performance of larvae measured in laboratory (critical swimming speed, Ucrit) and in the field (in situ swimming speed using SCUBA-based protocols).',
    'Pelagic Juvenile': 'Duration and characteristics of the pelagic juvenile phase, occurring after settlement but before full recruitment to the adult habitat.',
    'Rafting': 'Association of larvae or juveniles with floating objects (e.g., Sargassum, debris), which can significantly influence dispersal distance and direction.',
    'Larval Growth': 'Individual-level records of age-length/weight measurements across at least two-thirds of the larval phase, used to estimate growth rates.',
  },
  fr: {
    'Egg & Incubation': 'Caract\u00E9ristiques de l\'\u0153uf incluant sa position dans la colonne d\'eau, sa forme, sa taille et son volume. Inclut \u00E9galement des informations sur le vitellus et le(s) globule(s) lipidique(s) \u00E0 l\'int\u00E9rieur de l\'\u0153uf, et la dur\u00E9e d\'incubation ou de gestation.',
    'Hatching & Pre-flexion Stage': 'Taille des larves \u00E0 l\'\u00E9closion ou \u00E0 la parturition, moment et taille \u00E0 la premi\u00E8re alimentation (d\u00E9but de la nutrition exog\u00E8ne), et absorption du sac vitellin (d\u00E9pl\u00E9tion compl\u00E8te des r\u00E9serves de l\'\u0153uf).',
    'Flexion Stage': 'Moment et taille de la flexion de la notochorde \u2014 le flechissement vers le haut de la notochorde associ\u00E9 \u00E0 l\'ossification des \u00E9l\u00E9ments de la nageoire caudale. C\'est une \u00E9tape cl\u00E9 du d\u00E9veloppement larvaire.',
    'Metamorphosis': 'Moment, dur\u00E9e et taille \u00E0 la m\u00E9tamorphose \u2014 la transition du stade larvaire au stade juv\u00E9nile, souvent caract\u00E9ris\u00E9e par l\'apparition d\'\u00E9cailles, la croissance de toutes les \u00E9pines/rayons des nageoires, et des changements de proportions corporelles.',
    'Settlement': '\u00C2ge et taille auxquels les larves passent de la vie p\u00E9lagique \u00E0 la vie benthique/d\u00E9mersale (\u00E9tablissement). Cela marque la fin de la dur\u00E9e larvaire p\u00E9lagique (PLD).',
    'Vertical Position': 'Position des larves dans la colonne d\'eau, importante pour comprendre les sch\u00E9mas de dispersion car diff\u00E9rentes profondeurs subissent diff\u00E9rents r\u00E9gimes de courant.',
    'Swimming Speed': 'Performance de nage des larves mesur\u00E9e en laboratoire (vitesse de nage critique, Ucrit) et sur le terrain (vitesse de nage in situ utilisant des protocoles de plong\u00E9e sous-marine).',
    'Pelagic Juvenile': 'Dur\u00E9e et caract\u00E9ristiques de la phase juv\u00E9nile p\u00E9lagique, survenant apr\u00E8s l\'\u00E9tablissement mais avant le recrutement complet dans l\'habitat adulte.',
    'Rafting': 'Association de larves ou juv\u00E9niles avec des objets flottants (ex. sargasses, d\u00E9bris), pouvant influencer significativement la distance et la direction de dispersion.',
    'Larval Growth': 'Enregistrements individuels de mesures \u00E2ge-taille/poids couvrant au moins deux tiers de la phase larvaire, utilis\u00E9s pour estimer les taux de croissance.',
  },
  es: {
    'Egg & Incubation': 'Characteristics of the egg including its position in the water column, shape, size, and volume. Also includes information about the yolk and oil globule(s) inside the egg, and the duration of egg incubation or gestation.',
    'Hatching & Pre-flexion Stage': 'Size of larvae at hatching or parturition, timing and size at first feeding (start of exogenous nutrition), and yolk-sac absorption (complete depletion of egg resources).',
    'Flexion Stage': 'Timing and size of notochord flexion \u2014 the upward bending of the notochord associated with the ossification of caudal fin elements. This is a key developmental milestone in larval fish development.',
    'Metamorphosis': 'Timing, duration, and size at metamorphosis \u2014 the transition from larval to juvenile stage, often characterized by the appearance of scales, growth of all fin spines/rays, and changes in body proportions.',
    'Settlement': 'Age and size at which larvae transition from pelagic to benthic/demersal life (settlement). This marks the end of the pelagic larval duration (PLD).',
    'Vertical Position': 'Position of larvae in the water column, important for understanding dispersal patterns as different depths experience different current regimes.',
    'Swimming Speed': 'Swimming performance of larvae measured in laboratory (critical swimming speed, Ucrit) and in the field (in situ swimming speed using SCUBA-based protocols).',
    'Pelagic Juvenile': 'Duration and characteristics of the pelagic juvenile phase, occurring after settlement but before full recruitment to the adult habitat.',
    'Rafting': 'Association of larvae or juveniles with floating objects (e.g., Sargassum, debris), which can significantly influence dispersal distance and direction.',
    'Larval Growth': 'Individual-level records of age-length/weight measurements across at least two-thirds of the larval phase, used to estimate growth rates.',
  },
  pt: {
    'Egg & Incubation': 'Characteristics of the egg including its position in the water column, shape, size, and volume. Also includes information about the yolk and oil globule(s) inside the egg, and the duration of egg incubation or gestation.',
    'Hatching & Pre-flexion Stage': 'Size of larvae at hatching or parturition, timing and size at first feeding (start of exogenous nutrition), and yolk-sac absorption (complete depletion of egg resources).',
    'Flexion Stage': 'Timing and size of notochord flexion \u2014 the upward bending of the notochord associated with the ossification of caudal fin elements. This is a key developmental milestone in larval fish development.',
    'Metamorphosis': 'Timing, duration, and size at metamorphosis \u2014 the transition from larval to juvenile stage, often characterized by the appearance of scales, growth of all fin spines/rays, and changes in body proportions.',
    'Settlement': 'Age and size at which larvae transition from pelagic to benthic/demersal life (settlement). This marks the end of the pelagic larval duration (PLD).',
    'Vertical Position': 'Position of larvae in the water column, important for understanding dispersal patterns as different depths experience different current regimes.',
    'Swimming Speed': 'Swimming performance of larvae measured in laboratory (critical swimming speed, Ucrit) and in the field (in situ swimming speed using SCUBA-based protocols).',
    'Pelagic Juvenile': 'Duration and characteristics of the pelagic juvenile phase, occurring after settlement but before full recruitment to the adult habitat.',
    'Rafting': 'Association of larvae or juveniles with floating objects (e.g., Sargassum, debris), which can significantly influence dispersal distance and direction.',
    'Larval Growth': 'Individual-level records of age-length/weight measurements across at least two-thirds of the larval phase, used to estimate growth rates.',
  },
  de: {
    'Egg & Incubation': 'Characteristics of the egg including its position in the water column, shape, size, and volume. Also includes information about the yolk and oil globule(s) inside the egg, and the duration of egg incubation or gestation.',
    'Hatching & Pre-flexion Stage': 'Size of larvae at hatching or parturition, timing and size at first feeding (start of exogenous nutrition), and yolk-sac absorption (complete depletion of egg resources).',
    'Flexion Stage': 'Timing and size of notochord flexion \u2014 the upward bending of the notochord associated with the ossification of caudal fin elements. This is a key developmental milestone in larval fish development.',
    'Metamorphosis': 'Timing, duration, and size at metamorphosis \u2014 the transition from larval to juvenile stage, often characterized by the appearance of scales, growth of all fin spines/rays, and changes in body proportions.',
    'Settlement': 'Age and size at which larvae transition from pelagic to benthic/demersal life (settlement). This marks the end of the pelagic larval duration (PLD).',
    'Vertical Position': 'Position of larvae in the water column, important for understanding dispersal patterns as different depths experience different current regimes.',
    'Swimming Speed': 'Swimming performance of larvae measured in laboratory (critical swimming speed, Ucrit) and in the field (in situ swimming speed using SCUBA-based protocols).',
    'Pelagic Juvenile': 'Duration and characteristics of the pelagic juvenile phase, occurring after settlement but before full recruitment to the adult habitat.',
    'Rafting': 'Association of larvae or juveniles with floating objects (e.g., Sargassum, debris), which can significantly influence dispersal distance and direction.',
    'Larval Growth': 'Individual-level records of age-length/weight measurements across at least two-thirds of the larval phase, used to estimate growth rates.',
  },
  ja: {
    'Egg & Incubation': 'Characteristics of the egg including its position in the water column, shape, size, and volume. Also includes information about the yolk and oil globule(s) inside the egg, and the duration of egg incubation or gestation.',
    'Hatching & Pre-flexion Stage': 'Size of larvae at hatching or parturition, timing and size at first feeding (start of exogenous nutrition), and yolk-sac absorption (complete depletion of egg resources).',
    'Flexion Stage': 'Timing and size of notochord flexion \u2014 the upward bending of the notochord associated with the ossification of caudal fin elements. This is a key developmental milestone in larval fish development.',
    'Metamorphosis': 'Timing, duration, and size at metamorphosis \u2014 the transition from larval to juvenile stage, often characterized by the appearance of scales, growth of all fin spines/rays, and changes in body proportions.',
    'Settlement': 'Age and size at which larvae transition from pelagic to benthic/demersal life (settlement). This marks the end of the pelagic larval duration (PLD).',
    'Vertical Position': 'Position of larvae in the water column, important for understanding dispersal patterns as different depths experience different current regimes.',
    'Swimming Speed': 'Swimming performance of larvae measured in laboratory (critical swimming speed, Ucrit) and in the field (in situ swimming speed using SCUBA-based protocols).',
    'Pelagic Juvenile': 'Duration and characteristics of the pelagic juvenile phase, occurring after settlement but before full recruitment to the adult habitat.',
    'Rafting': 'Association of larvae or juveniles with floating objects (e.g., Sargassum, debris), which can significantly influence dispersal distance and direction.',
    'Larval Growth': 'Individual-level records of age-length/weight measurements across at least two-thirds of the larval phase, used to estimate growth rates.',
  },
  zh: {
    'Egg & Incubation': 'Characteristics of the egg including its position in the water column, shape, size, and volume. Also includes information about the yolk and oil globule(s) inside the egg, and the duration of egg incubation or gestation.',
    'Hatching & Pre-flexion Stage': 'Size of larvae at hatching or parturition, timing and size at first feeding (start of exogenous nutrition), and yolk-sac absorption (complete depletion of egg resources).',
    'Flexion Stage': 'Timing and size of notochord flexion \u2014 the upward bending of the notochord associated with the ossification of caudal fin elements. This is a key developmental milestone in larval fish development.',
    'Metamorphosis': 'Timing, duration, and size at metamorphosis \u2014 the transition from larval to juvenile stage, often characterized by the appearance of scales, growth of all fin spines/rays, and changes in body proportions.',
    'Settlement': 'Age and size at which larvae transition from pelagic to benthic/demersal life (settlement). This marks the end of the pelagic larval duration (PLD).',
    'Vertical Position': 'Position of larvae in the water column, important for understanding dispersal patterns as different depths experience different current regimes.',
    'Swimming Speed': 'Swimming performance of larvae measured in laboratory (critical swimming speed, Ucrit) and in the field (in situ swimming speed using SCUBA-based protocols).',
    'Pelagic Juvenile': 'Duration and characteristics of the pelagic juvenile phase, occurring after settlement but before full recruitment to the adult habitat.',
    'Rafting': 'Association of larvae or juveniles with floating objects (e.g., Sargassum, debris), which can significantly influence dispersal distance and direction.',
    'Larval Growth': 'Individual-level records of age-length/weight measurements across at least two-thirds of the larval phase, used to estimate growth rates.',
  },
  hi: {
    'Egg & Incubation': 'Characteristics of the egg including its position in the water column, shape, size, and volume. Also includes information about the yolk and oil globule(s) inside the egg, and the duration of egg incubation or gestation.',
    'Hatching & Pre-flexion Stage': 'Size of larvae at hatching or parturition, timing and size at first feeding (start of exogenous nutrition), and yolk-sac absorption (complete depletion of egg resources).',
    'Flexion Stage': 'Timing and size of notochord flexion \u2014 the upward bending of the notochord associated with the ossification of caudal fin elements. This is a key developmental milestone in larval fish development.',
    'Metamorphosis': 'Timing, duration, and size at metamorphosis \u2014 the transition from larval to juvenile stage, often characterized by the appearance of scales, growth of all fin spines/rays, and changes in body proportions.',
    'Settlement': 'Age and size at which larvae transition from pelagic to benthic/demersal life (settlement). This marks the end of the pelagic larval duration (PLD).',
    'Vertical Position': 'Position of larvae in the water column, important for understanding dispersal patterns as different depths experience different current regimes.',
    'Swimming Speed': 'Swimming performance of larvae measured in laboratory (critical swimming speed, Ucrit) and in the field (in situ swimming speed using SCUBA-based protocols).',
    'Pelagic Juvenile': 'Duration and characteristics of the pelagic juvenile phase, occurring after settlement but before full recruitment to the adult habitat.',
    'Rafting': 'Association of larvae or juveniles with floating objects (e.g., Sargassum, debris), which can significantly influence dispersal distance and direction.',
    'Larval Growth': 'Individual-level records of age-length/weight measurements across at least two-thirds of the larval phase, used to estimate growth rates.',
  },
  ar: {
    'Egg & Incubation': 'Characteristics of the egg including its position in the water column, shape, size, and volume. Also includes information about the yolk and oil globule(s) inside the egg, and the duration of egg incubation or gestation.',
    'Hatching & Pre-flexion Stage': 'Size of larvae at hatching or parturition, timing and size at first feeding (start of exogenous nutrition), and yolk-sac absorption (complete depletion of egg resources).',
    'Flexion Stage': 'Timing and size of notochord flexion \u2014 the upward bending of the notochord associated with the ossification of caudal fin elements. This is a key developmental milestone in larval fish development.',
    'Metamorphosis': 'Timing, duration, and size at metamorphosis \u2014 the transition from larval to juvenile stage, often characterized by the appearance of scales, growth of all fin spines/rays, and changes in body proportions.',
    'Settlement': 'Age and size at which larvae transition from pelagic to benthic/demersal life (settlement). This marks the end of the pelagic larval duration (PLD).',
    'Vertical Position': 'Position of larvae in the water column, important for understanding dispersal patterns as different depths experience different current regimes.',
    'Swimming Speed': 'Swimming performance of larvae measured in laboratory (critical swimming speed, Ucrit) and in the field (in situ swimming speed using SCUBA-based protocols).',
    'Pelagic Juvenile': 'Duration and characteristics of the pelagic juvenile phase, occurring after settlement but before full recruitment to the adult habitat.',
    'Rafting': 'Association of larvae or juveniles with floating objects (e.g., Sargassum, debris), which can significantly influence dispersal distance and direction.',
    'Larval Growth': 'Individual-level records of age-length/weight measurements across at least two-thirds of the larval phase, used to estimate growth rates.',
  },
  ru: {
    'Egg & Incubation': 'Characteristics of the egg including its position in the water column, shape, size, and volume. Also includes information about the yolk and oil globule(s) inside the egg, and the duration of egg incubation or gestation.',
    'Hatching & Pre-flexion Stage': 'Size of larvae at hatching or parturition, timing and size at first feeding (start of exogenous nutrition), and yolk-sac absorption (complete depletion of egg resources).',
    'Flexion Stage': 'Timing and size of notochord flexion \u2014 the upward bending of the notochord associated with the ossification of caudal fin elements. This is a key developmental milestone in larval fish development.',
    'Metamorphosis': 'Timing, duration, and size at metamorphosis \u2014 the transition from larval to juvenile stage, often characterized by the appearance of scales, growth of all fin spines/rays, and changes in body proportions.',
    'Settlement': 'Age and size at which larvae transition from pelagic to benthic/demersal life (settlement). This marks the end of the pelagic larval duration (PLD).',
    'Vertical Position': 'Position of larvae in the water column, important for understanding dispersal patterns as different depths experience different current regimes.',
    'Swimming Speed': 'Swimming performance of larvae measured in laboratory (critical swimming speed, Ucrit) and in the field (in situ swimming speed using SCUBA-based protocols).',
    'Pelagic Juvenile': 'Duration and characteristics of the pelagic juvenile phase, occurring after settlement but before full recruitment to the adult habitat.',
    'Rafting': 'Association of larvae or juveniles with floating objects (e.g., Sargassum, debris), which can significantly influence dispersal distance and direction.',
    'Larval Growth': 'Individual-level records of age-length/weight measurements across at least two-thirds of the larval phase, used to estimate growth rates.',
  },
};

/** Common names language mapping: i18n language -> CSV LANGUAGE column value */
export const COMMON_NAME_LANGUAGE_MAP: Record<Language, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  pt: 'Portuguese',
  de: 'German',
  ja: 'Japanese',
  zh: 'Chinese',
  hi: 'Hindi',
  ar: 'Arabic',
  ru: 'Russian',
};
