export interface SDGGoal {
  id: number;
  name: string;
  description: string;
  color: string;
  icon?: string;
}

export interface SDGTarget {
  id: string;
  goalNumber: number;
  text: string;
  description: string;
}

export const SDG_GOALS: SDGGoal[] = [
  {
    id: 1,
    name: 'No Poverty',
    description: 'End poverty in all its forms everywhere',
    color: '#E5243B',
  },
  {
    id: 2,
    name: 'Zero Hunger',
    description: 'End hunger, achieve food security and improved nutrition and promote sustainable agriculture',
    color: '#DDA63A',
  },
  {
    id: 3,
    name: 'Good Health and Well-being',
    description: 'Ensure healthy lives and promote well-being for all at all ages',
    color: '#4C9F38',
  },
  {
    id: 4,
    name: 'Quality Education',
    description: 'Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all',
    color: '#C5192D',
  },
  {
    id: 5,
    name: 'Gender Equality',
    description: 'Achieve gender equality and empower all women and girls',
    color: '#FF3A21',
  },
  {
    id: 6,
    name: 'Clean Water and Sanitation',
    description: 'Ensure availability and sustainable management of water and sanitation for all',
    color: '#26BDE2',
  },
  {
    id: 7,
    name: 'Affordable and Clean Energy',
    description: 'Ensure access to affordable, reliable, sustainable and modern energy for all',
    color: '#FCC30B',
  },
  {
    id: 8,
    name: 'Decent Work and Economic Growth',
    description: 'Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all',
    color: '#A21942',
  },
  {
    id: 9,
    name: 'Industry, Innovation and Infrastructure',
    description: 'Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation',
    color: '#FD6925',
  },
  {
    id: 10,
    name: 'Reduced Inequalities',
    description: 'Reduce inequality within and among countries',
    color: '#DD1367',
  },
  {
    id: 11,
    name: 'Sustainable Cities and Communities',
    description: 'Make cities and human settlements inclusive, safe, resilient and sustainable',
    color: '#FD9D24',
  },
  {
    id: 12,
    name: 'Responsible Consumption and Production',
    description: 'Ensure sustainable consumption and production patterns',
    color: '#BF8B2E',
  },
  {
    id: 13,
    name: 'Climate Action',
    description: 'Take urgent action to combat climate change and its impacts',
    color: '#3F7E44',
  },
  {
    id: 14,
    name: 'Life Below Water',
    description: 'Conserve and sustainably use the oceans, seas and marine resources for sustainable development',
    color: '#0A97D9',
  },
  {
    id: 15,
    name: 'Life on Land',
    description: 'Protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, and halt and reverse land degradation and halt biodiversity loss',
    color: '#56C02B',
  },
  {
    id: 16,
    name: 'Peace, Justice and Strong Institutions',
    description: 'Promote peaceful and inclusive societies for sustainable development, provide access to justice for all and build effective, accountable and inclusive institutions at all levels',
    color: '#00689D',
  },
  {
    id: 17,
    name: 'Partnerships for the Goals',
    description: 'Strengthen the means of implementation and revitalize the Global Partnership for Sustainable Development',
    color: '#19486A',
  },
];

// Sample SDG targets - in production, this would include all 169 targets
export const SDG_TARGETS: SDGTarget[] = [
  // Goal 1: No Poverty
  { id: '1.1', goalNumber: 1, text: 'Eradicate extreme poverty', description: 'By 2030, eradicate extreme poverty for all people everywhere, currently measured as people living on less than $1.25 a day' },
  { id: '1.2', goalNumber: 1, text: 'Reduce poverty by half', description: 'By 2030, reduce at least by half the proportion of men, women and children of all ages living in poverty in all its dimensions according to national definitions' },
  { id: '1.3', goalNumber: 1, text: 'Social protection systems', description: 'Implement nationally appropriate social protection systems and measures for all, including floors, and by 2030 achieve substantial coverage of the poor and the vulnerable' },
  { id: '1.4', goalNumber: 1, text: 'Equal rights to resources', description: 'By 2030, ensure that all men and women, in particular the poor and the vulnerable, have equal rights to economic resources, as well as access to basic services, ownership and control over land and other forms of property, inheritance, natural resources, appropriate new technology and financial services, including microfinance' },
  { id: '1.5', goalNumber: 1, text: 'Build resilience', description: 'By 2030, build the resilience of the poor and those in vulnerable situations and reduce their exposure and vulnerability to climate-related extreme events and other economic, social and environmental shocks and disasters' },
  { id: '1.a', goalNumber: 1, text: 'Mobilize resources', description: 'Ensure significant mobilization of resources from a variety of sources, including through enhanced development cooperation, in order to provide adequate and predictable means for developing countries, in particular least developed countries, to implement programmes and policies to end poverty in all its dimensions' },
  { id: '1.b', goalNumber: 1, text: 'Pro-poor policy frameworks', description: 'Create sound policy frameworks at the national, regional and international levels, based on pro-poor and gender-sensitive development strategies, to support accelerated investment in poverty eradication actions' },

  // Goal 2: Zero Hunger
  { id: '2.1', goalNumber: 2, text: 'End hunger', description: 'By 2030, end hunger and ensure access by all people, in particular the poor and people in vulnerable situations, including infants, to safe, nutritious and sufficient food all year round' },
  { id: '2.2', goalNumber: 2, text: 'End malnutrition', description: 'By 2030, end all forms of malnutrition, including achieving, by 2025, the internationally agreed targets on stunting and wasting in children under 5 years of age, and address the nutritional needs of adolescent girls, pregnant and lactating women and older persons' },
  { id: '2.3', goalNumber: 2, text: 'Double agricultural productivity', description: 'By 2030, double the agricultural productivity and incomes of small-scale food producers, in particular women, indigenous peoples, family farmers, pastoralists and fishers, including through secure and equal access to land, other productive resources and inputs, knowledge, financial services, markets and opportunities for value addition and non-farm employment' },
  { id: '2.4', goalNumber: 2, text: 'Sustainable food production', description: 'By 2030, ensure sustainable food production systems and implement resilient agricultural practices that increase productivity and production, that help maintain ecosystems, that strengthen capacity for adaptation to climate change, extreme weather, drought, flooding and other disasters and that progressively improve land and soil quality' },
  { id: '2.5', goalNumber: 2, text: 'Genetic diversity', description: 'By 2020, maintain the genetic diversity of seeds, cultivated plants and farmed and domesticated animals and their related wild species, including through soundly managed and diversified seed and plant banks at the national, regional and international levels' },

  // Goal 3: Good Health and Well-being
  { id: '3.1', goalNumber: 3, text: 'Reduce maternal mortality', description: 'By 2030, reduce the global maternal mortality ratio to less than 70 per 100,000 live births' },
  { id: '3.2', goalNumber: 3, text: 'End preventable deaths', description: 'By 2030, end preventable deaths of newborns and children under 5 years of age, with all countries aiming to reduce neonatal mortality to at least as low as 12 per 1,000 live births and under-5 mortality to at least as low as 25 per 1,000 live births' },
  { id: '3.3', goalNumber: 3, text: 'End epidemics', description: 'By 2030, end the epidemics of AIDS, tuberculosis, malaria and neglected tropical diseases and combat hepatitis, water-borne diseases and other communicable diseases' },
  { id: '3.4', goalNumber: 3, text: 'Reduce premature mortality', description: 'By 2030, reduce by one third premature mortality from non-communicable diseases through prevention and treatment and promote mental health and well-being' },
  { id: '3.5', goalNumber: 3, text: 'Substance abuse', description: 'Strengthen the prevention and treatment of substance abuse, including narcotic drug abuse and harmful use of alcohol' },

  // Goal 4: Quality Education
  { id: '4.1', goalNumber: 4, text: 'Free primary and secondary education', description: 'By 2030, ensure that all girls and boys complete free, equitable and quality primary and secondary education leading to relevant and effective learning outcomes' },
  { id: '4.2', goalNumber: 4, text: 'Early childhood development', description: 'By 2030, ensure that all girls and boys have access to quality early childhood development, care and pre-primary education so that they are ready for primary education' },
  { id: '4.3', goalNumber: 4, text: 'Equal access to education', description: 'By 2030, ensure equal access for all women and men to affordable and quality technical, vocational and tertiary education, including university' },
  { id: '4.4', goalNumber: 4, text: 'Relevant skills', description: 'By 2030, substantially increase the number of youth and adults who have relevant skills, including technical and vocational skills, for employment, decent jobs and entrepreneurship' },
  { id: '4.5', goalNumber: 4, text: 'Eliminate gender disparities', description: 'By 2030, eliminate gender disparities in education and ensure equal access to all levels of education and vocational training for the vulnerable, including persons with disabilities, indigenous peoples and children in vulnerable situations' },

  // Goal 5: Gender Equality
  { id: '5.1', goalNumber: 5, text: 'End discrimination', description: 'End all forms of discrimination against all women and girls everywhere' },
  { id: '5.2', goalNumber: 5, text: 'Eliminate violence', description: 'Eliminate all forms of violence against all women and girls in the public and private spheres, including trafficking and sexual and other types of exploitation' },
  { id: '5.3', goalNumber: 5, text: 'Eliminate harmful practices', description: 'Eliminate all harmful practices, such as child, early and forced marriage and female genital mutilation' },
  { id: '5.4', goalNumber: 5, text: 'Value unpaid care', description: 'Recognize and value unpaid care and domestic work through the provision of public services, infrastructure and social protection policies and the promotion of shared responsibility within the household and the family as nationally appropriate' },
  { id: '5.5', goalNumber: 5, text: 'Women\'s participation', description: 'Ensure women\'s full and effective participation and equal opportunities for leadership at all levels of decision-making in political, economic and public life' },
  { id: '5.6', goalNumber: 5, text: 'Reproductive rights', description: 'Ensure universal access to sexual and reproductive health and reproductive rights' },

  // Goal 6: Clean Water and Sanitation
  { id: '6.1', goalNumber: 6, text: 'Safe drinking water', description: 'By 2030, achieve universal and equitable access to safe and affordable drinking water for all' },
  { id: '6.2', goalNumber: 6, text: 'Sanitation and hygiene', description: 'By 2030, achieve access to adequate and equitable sanitation and hygiene for all and end open defecation, paying special attention to the needs of women and girls and those in vulnerable situations' },
  { id: '6.3', goalNumber: 6, text: 'Water quality', description: 'By 2030, improve water quality by reducing pollution, eliminating dumping and minimizing release of hazardous chemicals and materials' },
  { id: '6.4', goalNumber: 6, text: 'Water efficiency', description: 'By 2030, substantially increase water-use efficiency across all sectors and ensure sustainable withdrawals and supply of freshwater to address water scarcity' },

  // Goal 7: Affordable and Clean Energy
  { id: '7.1', goalNumber: 7, text: 'Universal access to energy', description: 'By 2030, ensure universal access to affordable, reliable and modern energy services' },
  { id: '7.2', goalNumber: 7, text: 'Renewable energy', description: 'By 2030, increase substantially the share of renewable energy in the global energy mix' },
  { id: '7.3', goalNumber: 7, text: 'Energy efficiency', description: 'By 2030, double the global rate of improvement in energy efficiency' },

  // Goal 8: Decent Work and Economic Growth
  { id: '8.1', goalNumber: 8, text: 'Economic growth', description: 'Sustain per capita economic growth in accordance with national circumstances and, in particular, at least 7 per cent gross domestic product growth per annum in the least developed countries' },
  { id: '8.2', goalNumber: 8, text: 'Economic productivity', description: 'Achieve higher levels of economic productivity through diversification, technological upgrading and innovation' },
  { id: '8.3', goalNumber: 8, text: 'Development-oriented policies', description: 'Promote development-oriented policies that support productive activities, decent job creation, entrepreneurship, creativity and innovation' },
  { id: '8.4', goalNumber: 8, text: 'Resource efficiency', description: 'Improve progressively, through 2030, global resource efficiency in consumption and production and endeavour to decouple economic growth from environmental degradation' },
  { id: '8.5', goalNumber: 8, text: 'Full employment', description: 'By 2030, achieve full and productive employment and decent work for all women and men, including for young people and persons with disabilities, and equal pay for work of equal value' },

  // Goal 9: Industry, Innovation and Infrastructure
  { id: '9.1', goalNumber: 9, text: 'Develop infrastructure', description: 'Develop quality, reliable, sustainable and resilient infrastructure, including regional and transborder infrastructure, to support economic development and human well-being' },
  { id: '9.2', goalNumber: 9, text: 'Inclusive industrialization', description: 'Promote inclusive and sustainable industrialization and, by 2030, significantly raise industry\'s share of employment and gross domestic product' },
  { id: '9.3', goalNumber: 9, text: 'Small-scale industries', description: 'Increase the access of small-scale industrial and other enterprises, in particular in developing countries, to financial services, including affordable credit, and their integration into value chains and markets' },
  { id: '9.4', goalNumber: 9, text: 'Upgrade infrastructure', description: 'By 2030, upgrade infrastructure and retrofit industries to make them sustainable, with increased resource-use efficiency and greater adoption of clean and environmentally sound technologies' },
  { id: '9.5', goalNumber: 9, text: 'Enhance research', description: 'Enhance scientific research, upgrade the technological capabilities of industrial sectors in all countries' },

  // Goal 10: Reduced Inequalities
  { id: '10.1', goalNumber: 10, text: 'Income growth', description: 'By 2030, progressively achieve and sustain income growth of the bottom 40 per cent of the population at a rate higher than the national average' },
  { id: '10.2', goalNumber: 10, text: 'Social inclusion', description: 'By 2030, empower and promote the social, economic and political inclusion of all, irrespective of age, sex, disability, race, ethnicity, origin, religion or economic or other status' },
  { id: '10.3', goalNumber: 10, text: 'Equal opportunities', description: 'Ensure equal opportunity and reduce inequalities of outcome, including by eliminating discriminatory laws, policies and practices' },
  { id: '10.4', goalNumber: 10, text: 'Fiscal policies', description: 'Adopt policies, especially fiscal, wage and social protection policies, and progressively achieve greater equality' },

  // Goal 11: Sustainable Cities and Communities
  { id: '11.1', goalNumber: 11, text: 'Safe housing', description: 'By 2030, ensure access for all to adequate, safe and affordable housing and basic services and upgrade slums' },
  { id: '11.2', goalNumber: 11, text: 'Transport systems', description: 'By 2030, provide access to safe, affordable, accessible and sustainable transport systems for all' },
  { id: '11.3', goalNumber: 11, text: 'Inclusive urbanization', description: 'By 2030, enhance inclusive and sustainable urbanization and capacity for participatory, integrated and sustainable human settlement planning and management in all countries' },
  { id: '11.4', goalNumber: 11, text: 'Cultural heritage', description: 'Strengthen efforts to protect and safeguard the world\'s cultural and natural heritage' },

  // Goal 12: Responsible Consumption and Production
  { id: '12.1', goalNumber: 12, text: 'Sustainable consumption', description: 'Implement the 10-Year Framework of Programmes on Sustainable Consumption and Production Patterns' },
  { id: '12.2', goalNumber: 12, text: 'Natural resources', description: 'By 2030, achieve the sustainable management and efficient use of natural resources' },
  { id: '12.3', goalNumber: 12, text: 'Food waste', description: 'By 2030, halve per capita global food waste at the retail and consumer levels and reduce food losses along production and supply chains' },
  { id: '12.4', goalNumber: 12, text: 'Chemical waste', description: 'By 2020, achieve the environmentally sound management of chemicals and all wastes throughout their life cycle' },
  { id: '12.5', goalNumber: 12, text: 'Reduce waste', description: 'By 2030, substantially reduce waste generation through prevention, reduction, recycling and reuse' },

  // Goal 13: Climate Action
  { id: '13.1', goalNumber: 13, text: 'Strengthen resilience', description: 'Strengthen resilience and adaptive capacity to climate-related hazards and natural disasters in all countries' },
  { id: '13.2', goalNumber: 13, text: 'Integrate climate measures', description: 'Integrate climate change measures into national policies, strategies and planning' },
  { id: '13.3', goalNumber: 13, text: 'Climate education', description: 'Improve education, awareness-raising and human and institutional capacity on climate change mitigation, adaptation, impact reduction and early warning' },

  // Goal 14: Life Below Water
  { id: '14.1', goalNumber: 14, text: 'Marine pollution', description: 'By 2025, prevent and significantly reduce marine pollution of all kinds, in particular from land-based activities' },
  { id: '14.2', goalNumber: 14, text: 'Marine ecosystems', description: 'By 2020, sustainably manage and protect marine and coastal ecosystems to avoid significant adverse impacts' },
  { id: '14.3', goalNumber: 14, text: 'Ocean acidification', description: 'Minimize and address the impacts of ocean acidification, including through enhanced scientific cooperation at all levels' },
  { id: '14.4', goalNumber: 14, text: 'Sustainable fishing', description: 'By 2020, effectively regulate harvesting and end overfishing, illegal, unreported and unregulated fishing and destructive fishing practices' },

  // Goal 15: Life on Land
  { id: '15.1', goalNumber: 15, text: 'Terrestrial ecosystems', description: 'By 2020, ensure the conservation, restoration and sustainable use of terrestrial and inland freshwater ecosystems and their services' },
  { id: '15.2', goalNumber: 15, text: 'Sustainable forests', description: 'By 2020, promote the implementation of sustainable management of all types of forests, halt deforestation, restore degraded forests' },
  { id: '15.3', goalNumber: 15, text: 'Combat desertification', description: 'By 2030, combat desertification, restore degraded land and soil, including land affected by desertification, drought and floods' },
  { id: '15.4', goalNumber: 15, text: 'Mountain ecosystems', description: 'By 2030, ensure the conservation of mountain ecosystems, including their biodiversity' },

  // Goal 16: Peace, Justice and Strong Institutions
  { id: '16.1', goalNumber: 16, text: 'Reduce violence', description: 'Significantly reduce all forms of violence and related death rates everywhere' },
  { id: '16.2', goalNumber: 16, text: 'End child abuse', description: 'End abuse, exploitation, trafficking and all forms of violence against and torture of children' },
  { id: '16.3', goalNumber: 16, text: 'Rule of law', description: 'Promote the rule of law at the national and international levels and ensure equal access to justice for all' },
  { id: '16.4', goalNumber: 16, text: 'Combat crime', description: 'By 2030, significantly reduce illicit financial and arms flows, strengthen the recovery and return of stolen assets and combat all forms of organized crime' },
  { id: '16.5', goalNumber: 16, text: 'Reduce corruption', description: 'Substantially reduce corruption and bribery in all their forms' },

  // Goal 17: Partnerships for the Goals
  { id: '17.1', goalNumber: 17, text: 'Domestic resources', description: 'Strengthen domestic resource mobilization, including through international support to developing countries' },
  { id: '17.2', goalNumber: 17, text: 'ODA commitments', description: 'Developed countries to implement fully their official development assistance commitments' },
  { id: '17.3', goalNumber: 17, text: 'Additional resources', description: 'Mobilize additional financial resources for developing countries from multiple sources' },
  { id: '17.4', goalNumber: 17, text: 'Debt sustainability', description: 'Assist developing countries in attaining long-term debt sustainability through coordinated policies' },
  { id: '17.5', goalNumber: 17, text: 'Investment promotion', description: 'Adopt and implement investment promotion regimes for least developed countries' },
];

// Helper function to get targets for a specific goal
export function getTargetsForGoal(goalNumber: number): SDGTarget[] {
  return SDG_TARGETS.filter(target => target.goalNumber === goalNumber);
}

// Helper function to get goal by ID
export function getGoalById(goalId: number): SDGGoal | undefined {
  return SDG_GOALS.find(goal => goal.id === goalId);
} 