import type { Node, Edge } from '@xyflow/react';
import type { HITeCNodeData, HITeCEdgeData, CrossViewLink } from '../types/hitec';

interface Preset {
  label: string;
  structureNodes: Node<HITeCNodeData>[];
  structureEdges: Edge<HITeCEdgeData>[];
  causalNodes: Node<HITeCNodeData>[];
  causalEdges: Edge<HITeCEdgeData>[];
  crossLinks: CrossViewLink[];
}

function sn(id: string, type: HITeCNodeData['nodeType'], label: string, x: number, y: number, params: { key: string; value: string }[] = []): Node<HITeCNodeData> {
  return { id, type: 'hitecNode', position: { x, y }, data: { label, nodeType: type, params } };
}

function se(id: string, source: string, target: string, edgeType: HITeCEdgeData['edgeType'], value?: string): Edge<HITeCEdgeData> {
  return { id, source, target, type: 'hitecEdge', data: { edgeType, value } };
}

export const PRESETS: Record<string, Preset> = {
  hitec: {
    label: 'Supply Chain HITeC',
    structureNodes: [
      sn('s1', 'complex', 'Systeme Logistique', 200, 30),
      sn('s2', 'complex', 'Transport', 80, 200),
      sn('s3', 'complex', 'Stockage', 360, 200),
      sn('s4', 'elementary', 'Camion A', 20, 400, [{ key: 'Immat.', value: 'AB-123-CD' }]),
      sn('s5', 'elementary', 'Camion B', 200, 400, [{ key: 'Immat.', value: 'EF-456-GH' }]),
      sn('s6', 'elementary', 'Entrepot Lyon', 360, 400, [{ key: 'Surface', value: '5000 m2' }]),
    ],
    structureEdges: [
      se('se1', 's1', 's2', 'containment'),
      se('se2', 's1', 's3', 'containment'),
      se('se3', 's2', 's4', 'containment'),
      se('se4', 's2', 's5', 'containment'),
      se('se5', 's3', 's6', 'containment'),
    ],
    causalNodes: [
      sn('c1', 'component', 'Vitesse Transport', 40, 40, [{ key: 'Val.', value: '80 km/h' }, { key: 'Type', value: 'Internal' }]),
      sn('c2', 'component', 'Capacite Stockage', 300, 40, [{ key: 'Val.', value: '2000 m3' }, { key: 'Type', value: 'Internal' }]),
      sn('c3', 'component', 'Demande Externe', 560, 40, [{ key: 'Val.', value: '150 t/j' }, { key: 'Type', value: 'External' }]),
      sn('c4', 'potential', 'Surcharge Reseau', 120, 220, [{ key: 'Nature', value: 'Danger' }]),
      sn('c5', 'potential', 'Nouveau Marche', 480, 220, [{ key: 'Nature', value: 'Favorability' }]),
      sn('c6', 'potentiality', 'Risque Rupture', 120, 400, [{ key: 'Nature', value: 'Risk' }, { key: 'Prob.', value: '0.3' }]),
      sn('c7', 'potentiality', 'Opportunite Croiss.', 480, 400, [{ key: 'Nature', value: 'Opportunity' }, { key: 'Prob.', value: '0.6' }]),
      sn('c8', 'actuality', 'Perte Client', 120, 580, [{ key: 'Nature', value: 'Damage' }, { key: 'Cout', value: '50k EUR' }]),
      sn('c9', 'actuality', 'Gain Part Marche', 480, 580, [{ key: 'Nature', value: 'Benefit' }, { key: 'Rev.', value: '+120k EUR' }]),
    ],
    causalEdges: [
      se('ce1', 'c1', 'c4', 'generation'),
      se('ce2', 'c3', 'c5', 'generation'),
      se('ce3', 'c2', 'c4', 'susceptibilityCondition'),
      se('ce4', 'c1', 'c4', 'existenceCondition'),
      se('ce5', 'c4', 'c6', 'generation'),
      se('ce6', 'c5', 'c7', 'generation'),
      se('ce7', 'c1', 'c6', 'triggeringCondition'),
      se('ce8', 'c2', 'c7', 'triggeringCondition'),
      se('ce9', 'c6', 'c8', 'generation'),
      se('ce10', 'c7', 'c9', 'generation'),
      se('ce11', 'c8', 'c2', 'impact'),
      se('ce12', 'c9', 'c3', 'impact'),
      se('ce13', 'c1', 'c2', 'affectation'),
      se('ce14', 'c3', 'c2', 'coefficient', '0.8'),
    ],
    crossLinks: [
      { elementaryId: 's4', componentId: 'c1' },
      { elementaryId: 's5', componentId: 'c1' },
      { elementaryId: 's6', componentId: 'c2' },
    ],
  },

  simple: {
    label: 'Systeme Simple',
    structureNodes: [
      sn('ss1', 'complex', 'Systeme', 200, 40),
      sn('ss2', 'elementary', 'Element A', 100, 220),
      sn('ss3', 'elementary', 'Element B', 320, 220),
    ],
    structureEdges: [
      se('sse1', 'ss1', 'ss2', 'containment'),
      se('sse2', 'ss1', 'ss3', 'containment'),
    ],
    causalNodes: [
      sn('sc1', 'component', 'Composant Central', 200, 40, [{ key: 'Val.', value: '100' }]),
      sn('sc2', 'potential', 'Risque', 200, 220, [{ key: 'Nature', value: 'Danger' }]),
    ],
    causalEdges: [
      se('sce1', 'sc1', 'sc2', 'generation'),
    ],
    crossLinks: [
      { elementaryId: 'ss2', componentId: 'sc1' },
      { elementaryId: 'ss3', componentId: 'sc1' },
    ],
  },

  danger: {
    label: 'Scenario Danger',
    structureNodes: [
      sn('ds1', 'complex', 'Usine Chimique', 200, 40),
      sn('ds2', 'elementary', 'Reacteur R1', 100, 220),
      sn('ds3', 'elementary', 'Cuve C1', 340, 220),
    ],
    structureEdges: [
      se('dse1', 'ds1', 'ds2', 'containment'),
      se('dse2', 'ds1', 'ds3', 'containment'),
    ],
    causalNodes: [
      sn('dc1', 'component', 'Temperature', 60, 40, [{ key: 'Val.', value: '350 C' }, { key: 'Type', value: 'Internal' }]),
      sn('dc2', 'component', 'Pression', 340, 40, [{ key: 'Val.', value: '12 bar' }, { key: 'Type', value: 'Internal' }]),
      sn('dc3', 'potential', 'Surchauffe', 200, 200, [{ key: 'Nature', value: 'Danger' }]),
      sn('dc4', 'potentiality', 'Risque Explosion', 200, 360, [{ key: 'Nature', value: 'Risk' }, { key: 'Prob.', value: '0.05' }]),
      sn('dc5', 'actuality', 'Dommage', 200, 520, [{ key: 'Nature', value: 'Damage' }, { key: 'Cout', value: '2M EUR' }]),
    ],
    causalEdges: [
      se('dce1', 'dc1', 'dc3', 'generation'),
      se('dce2', 'dc2', 'dc3', 'susceptibilityCondition'),
      se('dce3', 'dc3', 'dc4', 'generation'),
      se('dce4', 'dc1', 'dc4', 'triggeringCondition'),
      se('dce5', 'dc4', 'dc5', 'generation'),
      se('dce6', 'dc5', 'dc1', 'impact'),
      se('dce7', 'dc5', 'dc2', 'impact'),
      se('dce8', 'dc1', 'dc2', 'coefficient', '1.2'),
    ],
    crossLinks: [
      { elementaryId: 'ds2', componentId: 'dc1' },
      { elementaryId: 'ds3', componentId: 'dc2' },
    ],
  },
};
