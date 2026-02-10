import type { Component, CausalChain } from '@/types/model'
import type { Scenario } from '@/types/scenario'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export interface InfoCard {
  id: string
  text: string
  position: { x: number; y: number }
}

export interface PrebuiltScenario {
  id: string
  title: string
  description: string
  difficulty: Difficulty
  nodeCount: number
  components: Component[]
  chains: CausalChain[]
  scenario: Scenario
  infoCards: InfoCard[]
}

export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string; colorClass: string }> = {
  beginner: { label: 'Beginner', color: '#22c55e', colorClass: 'bg-green-500/20 text-green-400' },
  intermediate: { label: 'Intermediate', color: '#3b82f6', colorClass: 'bg-blue-500/20 text-blue-400' },
  advanced: { label: 'Advanced', color: '#f59e0b', colorClass: 'bg-orange-500/20 text-orange-400' },
  expert: { label: 'Expert', color: '#ef4444', colorClass: 'bg-red-500/20 text-red-400' },
}

export const prebuiltScenarios: PrebuiltScenario[] = [
  {
    id: 'hello-cascade',
    title: 'Hello Cascade',
    description: 'A minimal two-component example showing how one component can trigger a cascade in another. Perfect starting point.',
    difficulty: 'beginner',
    nodeCount: 2,
    components: [
      {
        id: 'hc-comp-1',
        name: 'Sensor',
        type: 'external',
        parameters: [{ id: 'hc-p1', name: 'temperature', value: 20 }],
        capacities: [],
        position: { x: 100, y: 200 },
      },
      {
        id: 'hc-comp-2',
        name: 'Alarm',
        type: 'internal',
        parameters: [{ id: 'hc-p2', name: 'threshold', value: 50 }, { id: 'hc-p3', name: 'active', value: 0 }],
        capacities: [{ id: 'hc-cap1', name: 'volume', min: 0, max: 100 }],
        position: { x: 500, y: 200 },
      },
    ],
    chains: [
      {
        id: 'hc-chain-1',
        name: 'Heat Alert',
        chainType: 'inflicted',
        sourceId: 'hc-comp-1',
        targetId: 'hc-comp-2',
        stages: {
          potential: { id: 'hc-cond-1', expression: 'Sensor_temperature > 40', type: 'existence' },
          potentiality: { id: 'hc-cond-2', expression: 'Alarm_threshold < 100', type: 'susceptibility' },
          actuality: {
            triggering: { id: 'hc-cond-3', expression: 'Sensor_temperature > Alarm_threshold', type: 'triggering' },
            consequences: [{ id: 'hc-cons-1', parameterId: 'hc-p3', function: '1', durationType: 'persistent' }],
          },
        },
      },
    ],
    scenario: {
      id: 'hc-scenario-1',
      name: 'Rising Temperature',
      forcedEvents: [
        { id: 'hc-ev-1', componentId: 'hc-comp-1', parameterId: 'hc-p1', value: 60, time: 2 },
      ],
    },
    infoCards: [
      { id: 'hc-info-1', text: 'This external sensor provides temperature readings to the system.', position: { x: 80, y: 80 } },
      { id: 'hc-info-2', text: 'The alarm activates when the temperature exceeds its threshold via the causal chain.', position: { x: 480, y: 80 } },
    ],
  },
  {
    id: 'branching-paths',
    title: 'Branching Paths',
    description: 'One source component affects multiple targets through different causal chains, demonstrating branching cascade effects.',
    difficulty: 'beginner',
    nodeCount: 4,
    components: [
      {
        id: 'bp-comp-1',
        name: 'Power Grid',
        type: 'internal',
        parameters: [{ id: 'bp-p1', name: 'voltage', value: 220 }, { id: 'bp-p2', name: 'load', value: 50 }],
        capacities: [{ id: 'bp-cap1', name: 'capacity', min: 0, max: 500 }],
        position: { x: 300, y: 50 },
      },
      {
        id: 'bp-comp-2',
        name: 'Hospital',
        type: 'internal',
        parameters: [{ id: 'bp-p3', name: 'power_supply', value: 100 }, { id: 'bp-p4', name: 'backup_gen', value: 0 }],
        capacities: [{ id: 'bp-cap2', name: 'generator_fuel', min: 0, max: 48 }],
        position: { x: 100, y: 350 },
      },
      {
        id: 'bp-comp-3',
        name: 'Factory',
        type: 'internal',
        parameters: [{ id: 'bp-p5', name: 'production', value: 100 }, { id: 'bp-p6', name: 'downtime', value: 0 }],
        capacities: [{ id: 'bp-cap3', name: 'inventory', min: 0, max: 1000 }],
        position: { x: 500, y: 350 },
      },
      {
        id: 'bp-comp-4',
        name: 'Weather',
        type: 'external',
        parameters: [{ id: 'bp-p7', name: 'storm_severity', value: 0 }],
        capacities: [],
        position: { x: 300, y: 350 },
      },
    ],
    chains: [
      {
        id: 'bp-chain-1',
        name: 'Power to Hospital',
        chainType: 'inflicted',
        sourceId: 'bp-comp-1',
        targetId: 'bp-comp-2',
        stages: {
          potential: { id: 'bp-cond-1', expression: 'Power_Grid_voltage < 100', type: 'existence' },
          potentiality: { id: 'bp-cond-2', expression: 'Hospital_backup_gen == 0', type: 'susceptibility' },
          actuality: {
            triggering: { id: 'bp-cond-3', expression: 'Power_Grid_voltage < 50', type: 'triggering' },
            consequences: [{ id: 'bp-cons-1', parameterId: 'bp-p3', function: '0', durationType: 'persistent' }],
          },
        },
      },
      {
        id: 'bp-chain-2',
        name: 'Power to Factory',
        chainType: 'inflicted',
        sourceId: 'bp-comp-1',
        targetId: 'bp-comp-3',
        stages: {
          potential: { id: 'bp-cond-4', expression: 'Power_Grid_voltage < 150', type: 'existence' },
          potentiality: { id: 'bp-cond-5', expression: 'Factory_production > 0', type: 'susceptibility' },
          actuality: {
            triggering: { id: 'bp-cond-6', expression: 'Power_Grid_voltage < 100', type: 'triggering' },
            consequences: [
              { id: 'bp-cons-2', parameterId: 'bp-p5', function: '0', durationType: 'persistent' },
              { id: 'bp-cons-3', parameterId: 'bp-p6', function: '1', durationType: 'persistent' },
            ],
          },
        },
      },
    ],
    scenario: {
      id: 'bp-scenario-1',
      name: 'Storm Outage',
      forcedEvents: [
        { id: 'bp-ev-1', componentId: 'bp-comp-4', parameterId: 'bp-p7', value: 8, time: 1 },
        { id: 'bp-ev-2', componentId: 'bp-comp-1', parameterId: 'bp-p1', value: 40, time: 3 },
      ],
    },
    infoCards: [
      { id: 'bp-info-1', text: 'The power grid supplies electricity to both the hospital and factory.', position: { x: 280, y: -60 } },
      { id: 'bp-info-2', text: 'When power drops, both downstream components are affected through separate chains.', position: { x: 550, y: 170 } },
    ],
  },
  {
    id: 'supply-chain-disruption',
    title: 'Supply Chain Disruption',
    description: 'Models a 7-node global supply chain where disruption at one point cascades through suppliers, manufacturers, and retailers.',
    difficulty: 'intermediate',
    nodeCount: 7,
    components: [
      {
        id: 'sc-comp-1', name: 'Raw Materials', type: 'external',
        parameters: [{ id: 'sc-p1', name: 'availability', value: 100 }],
        capacities: [], position: { x: 50, y: 100 },
      },
      {
        id: 'sc-comp-2', name: 'Supplier A', type: 'internal',
        parameters: [{ id: 'sc-p2', name: 'output', value: 100 }, { id: 'sc-p3', name: 'inventory', value: 500 }],
        capacities: [{ id: 'sc-cap1', name: 'storage', min: 0, max: 1000 }],
        position: { x: 250, y: 50 },
      },
      {
        id: 'sc-comp-3', name: 'Supplier B', type: 'internal',
        parameters: [{ id: 'sc-p4', name: 'output', value: 80 }, { id: 'sc-p5', name: 'inventory', value: 300 }],
        capacities: [{ id: 'sc-cap2', name: 'storage', min: 0, max: 600 }],
        position: { x: 250, y: 250 },
      },
      {
        id: 'sc-comp-4', name: 'Manufacturer', type: 'internal',
        parameters: [{ id: 'sc-p6', name: 'production_rate', value: 90 }, { id: 'sc-p7', name: 'quality', value: 95 }],
        capacities: [{ id: 'sc-cap3', name: 'capacity', min: 0, max: 200 }],
        position: { x: 500, y: 150 },
      },
      {
        id: 'sc-comp-5', name: 'Logistics', type: 'internal',
        parameters: [{ id: 'sc-p8', name: 'throughput', value: 100 }, { id: 'sc-p9', name: 'delay_days', value: 2 }],
        capacities: [{ id: 'sc-cap4', name: 'fleet', min: 0, max: 50 }],
        position: { x: 700, y: 150 },
      },
      {
        id: 'sc-comp-6', name: 'Retailer', type: 'internal',
        parameters: [{ id: 'sc-p10', name: 'stock', value: 1000 }, { id: 'sc-p11', name: 'sales', value: 80 }],
        capacities: [{ id: 'sc-cap5', name: 'shelf_space', min: 0, max: 2000 }],
        position: { x: 900, y: 150 },
      },
      {
        id: 'sc-comp-7', name: 'Market Demand', type: 'external',
        parameters: [{ id: 'sc-p12', name: 'demand', value: 80 }],
        capacities: [], position: { x: 900, y: 350 },
      },
    ],
    chains: [
      {
        id: 'sc-chain-1', name: 'Raw to Supplier A', chainType: 'inflicted',
        sourceId: 'sc-comp-1', targetId: 'sc-comp-2',
        stages: {
          potential: { id: 'sc-c1', expression: 'Raw_Materials_availability < 80', type: 'existence' },
          potentiality: { id: 'sc-c2', expression: 'Supplier_A_inventory < 600', type: 'susceptibility' },
          actuality: {
            triggering: { id: 'sc-c3', expression: 'Raw_Materials_availability < 50', type: 'triggering' },
            consequences: [{ id: 'sc-x1', parameterId: 'sc-p2', function: 'Raw_Materials_availability * 0.5', durationType: 'persistent' }],
          },
        },
      },
      {
        id: 'sc-chain-2', name: 'Supplier A to Manufacturer', chainType: 'inflicted',
        sourceId: 'sc-comp-2', targetId: 'sc-comp-4',
        stages: {
          potential: { id: 'sc-c4', expression: 'Supplier_A_output < 80', type: 'existence' },
          potentiality: { id: 'sc-c5', expression: 'Manufacturer_production_rate > 0', type: 'susceptibility' },
          actuality: {
            triggering: { id: 'sc-c6', expression: 'Supplier_A_output < 50', type: 'triggering' },
            consequences: [{ id: 'sc-x2', parameterId: 'sc-p6', function: 'Supplier_A_output * 0.6', durationType: 'persistent' }],
          },
        },
      },
      {
        id: 'sc-chain-3', name: 'Manufacturer to Logistics', chainType: 'inflicted',
        sourceId: 'sc-comp-4', targetId: 'sc-comp-5',
        stages: {
          potential: { id: 'sc-c7', expression: 'Manufacturer_production_rate < 70', type: 'existence' },
          potentiality: { id: 'sc-c8', expression: 'Logistics_throughput > 0', type: 'susceptibility' },
          actuality: {
            triggering: { id: 'sc-c9', expression: 'Manufacturer_production_rate < 40', type: 'triggering' },
            consequences: [{ id: 'sc-x3', parameterId: 'sc-p8', function: 'Manufacturer_production_rate * 0.8', durationType: 'persistent' }],
          },
        },
      },
      {
        id: 'sc-chain-4', name: 'Logistics to Retailer', chainType: 'inflicted',
        sourceId: 'sc-comp-5', targetId: 'sc-comp-6',
        stages: {
          potential: { id: 'sc-c10', expression: 'Logistics_throughput < 80', type: 'existence' },
          potentiality: { id: 'sc-c11', expression: 'Retailer_stock > 0', type: 'susceptibility' },
          actuality: {
            triggering: { id: 'sc-c12', expression: 'Logistics_throughput < 50', type: 'triggering' },
            consequences: [{ id: 'sc-x4', parameterId: 'sc-p10', function: 'Retailer_stock - 200', durationType: 'persistent' }],
          },
        },
      },
    ],
    scenario: {
      id: 'sc-scenario-1',
      name: 'Supply Shortage',
      forcedEvents: [
        { id: 'sc-ev-1', componentId: 'sc-comp-1', parameterId: 'sc-p1', value: 30, time: 1 },
        { id: 'sc-ev-2', componentId: 'sc-comp-7', parameterId: 'sc-p12', value: 120, time: 3 },
      ],
    },
    infoCards: [
      { id: 'sc-info-1', text: 'Raw materials are the entry point — disruptions here cascade downstream.', position: { x: 30, y: -10 } },
      { id: 'sc-info-2', text: 'Two suppliers provide redundancy, but both depend on raw material availability.', position: { x: 230, y: 370 } },
      { id: 'sc-info-3', text: 'The manufacturer bottleneck amplifies upstream disruptions as production drops.', position: { x: 480, y: 300 } },
    ],
  },
  {
    id: 'global-manufacturing-network',
    title: 'Global Manufacturing Network',
    description: 'A complex 12-node network modeling factories, warehouses, transport links, and markets across multiple regions.',
    difficulty: 'advanced',
    nodeCount: 12,
    components: [
      { id: 'gm-1', name: 'China Factory', type: 'internal', parameters: [{ id: 'gm-p1', name: 'output', value: 1000 }, { id: 'gm-p2', name: 'workers', value: 500 }], capacities: [{ id: 'gm-c1', name: 'capacity', min: 0, max: 2000 }], position: { x: 50, y: 50 } },
      { id: 'gm-2', name: 'India Factory', type: 'internal', parameters: [{ id: 'gm-p3', name: 'output', value: 600 }, { id: 'gm-p4', name: 'workers', value: 300 }], capacities: [{ id: 'gm-c2', name: 'capacity', min: 0, max: 1200 }], position: { x: 50, y: 250 } },
      { id: 'gm-3', name: 'Asia Warehouse', type: 'internal', parameters: [{ id: 'gm-p5', name: 'stock', value: 5000 }], capacities: [{ id: 'gm-c3', name: 'storage', min: 0, max: 10000 }], position: { x: 300, y: 150 } },
      { id: 'gm-4', name: 'Shipping Lane', type: 'internal', parameters: [{ id: 'gm-p6', name: 'throughput', value: 100 }, { id: 'gm-p7', name: 'delay', value: 14 }], capacities: [{ id: 'gm-c4', name: 'fleet', min: 0, max: 50 }], position: { x: 550, y: 50 } },
      { id: 'gm-5', name: 'Air Freight', type: 'internal', parameters: [{ id: 'gm-p8', name: 'throughput', value: 30 }, { id: 'gm-p9', name: 'cost', value: 500 }], capacities: [{ id: 'gm-c5', name: 'planes', min: 0, max: 10 }], position: { x: 550, y: 250 } },
      { id: 'gm-6', name: 'EU Warehouse', type: 'internal', parameters: [{ id: 'gm-p10', name: 'stock', value: 3000 }], capacities: [{ id: 'gm-c6', name: 'storage', min: 0, max: 8000 }], position: { x: 800, y: 50 } },
      { id: 'gm-7', name: 'US Warehouse', type: 'internal', parameters: [{ id: 'gm-p11', name: 'stock', value: 4000 }], capacities: [{ id: 'gm-c7', name: 'storage', min: 0, max: 10000 }], position: { x: 800, y: 250 } },
      { id: 'gm-8', name: 'EU Market', type: 'internal', parameters: [{ id: 'gm-p12', name: 'demand', value: 200 }, { id: 'gm-p13', name: 'satisfaction', value: 95 }], capacities: [], position: { x: 1050, y: 50 } },
      { id: 'gm-9', name: 'US Market', type: 'internal', parameters: [{ id: 'gm-p14', name: 'demand', value: 300 }, { id: 'gm-p15', name: 'satisfaction', value: 90 }], capacities: [], position: { x: 1050, y: 250 } },
      { id: 'gm-10', name: 'Trade Policy', type: 'external', parameters: [{ id: 'gm-p16', name: 'tariff', value: 5 }], capacities: [], position: { x: 550, y: 400 } },
      { id: 'gm-11', name: 'Oil Price', type: 'external', parameters: [{ id: 'gm-p17', name: 'price', value: 70 }], capacities: [], position: { x: 300, y: 400 } },
      { id: 'gm-12', name: 'Currency Rate', type: 'external', parameters: [{ id: 'gm-p18', name: 'usd_cny', value: 7.2 }], capacities: [], position: { x: 800, y: 400 } },
    ],
    chains: [
      { id: 'gm-ch1', name: 'China to Asia WH', chainType: 'inflicted', sourceId: 'gm-1', targetId: 'gm-3', stages: { potential: { id: 'gm-cd1', expression: 'China_Factory_output > 0', type: 'existence' }, potentiality: { id: 'gm-cd2', expression: 'Asia_Warehouse_stock < 9000', type: 'susceptibility' }, actuality: { triggering: { id: 'gm-cd3', expression: 'China_Factory_output < 500', type: 'triggering' }, consequences: [{ id: 'gm-cx1', parameterId: 'gm-p5', function: 'Asia_Warehouse_stock - 500', durationType: 'persistent' }] } } },
      { id: 'gm-ch2', name: 'Asia WH to Shipping', chainType: 'inflicted', sourceId: 'gm-3', targetId: 'gm-4', stages: { potential: { id: 'gm-cd4', expression: 'Asia_Warehouse_stock < 3000', type: 'existence' }, potentiality: { id: 'gm-cd5', expression: 'Shipping_Lane_throughput > 0', type: 'susceptibility' }, actuality: { triggering: { id: 'gm-cd6', expression: 'Asia_Warehouse_stock < 1000', type: 'triggering' }, consequences: [{ id: 'gm-cx2', parameterId: 'gm-p6', function: '30', durationType: 'persistent' }] } } },
      { id: 'gm-ch3', name: 'Shipping to EU WH', chainType: 'inflicted', sourceId: 'gm-4', targetId: 'gm-6', stages: { potential: { id: 'gm-cd7', expression: 'Shipping_Lane_throughput < 80', type: 'existence' }, potentiality: { id: 'gm-cd8', expression: 'EU_Warehouse_stock > 0', type: 'susceptibility' }, actuality: { triggering: { id: 'gm-cd9', expression: 'Shipping_Lane_throughput < 50', type: 'triggering' }, consequences: [{ id: 'gm-cx3', parameterId: 'gm-p10', function: 'EU_Warehouse_stock - 400', durationType: 'persistent' }] } } },
      { id: 'gm-ch4', name: 'EU WH to EU Market', chainType: 'inflicted', sourceId: 'gm-6', targetId: 'gm-8', stages: { potential: { id: 'gm-cd10', expression: 'EU_Warehouse_stock < 2000', type: 'existence' }, potentiality: { id: 'gm-cd11', expression: 'EU_Market_demand > 0', type: 'susceptibility' }, actuality: { triggering: { id: 'gm-cd12', expression: 'EU_Warehouse_stock < 500', type: 'triggering' }, consequences: [{ id: 'gm-cx4', parameterId: 'gm-p13', function: '40', durationType: 'persistent' }] } } },
    ],
    scenario: {
      id: 'gm-scenario-1',
      name: 'Factory Shutdown',
      forcedEvents: [
        { id: 'gm-ev1', componentId: 'gm-1', parameterId: 'gm-p1', value: 100, time: 1 },
        { id: 'gm-ev2', componentId: 'gm-1', parameterId: 'gm-p2', value: 50, time: 1 },
      ],
    },
    infoCards: [
      { id: 'gm-info-1', text: 'Asia-based factories feed into a regional warehouse before global distribution.', position: { x: 30, y: -60 } },
      { id: 'gm-info-2', text: 'Two transport modes (sea and air) provide different speed/cost tradeoffs.', position: { x: 530, y: -60 } },
    ],
  },
  {
    id: 'pandemic-stress-test',
    title: 'Pandemic Stress Test',
    description: 'A 17-node model simulating how a pandemic cascades through healthcare, economy, supply chains, and social systems simultaneously.',
    difficulty: 'expert',
    nodeCount: 17,
    components: [
      { id: 'ps-1', name: 'Virus Spread', type: 'external', parameters: [{ id: 'ps-p1', name: 'infection_rate', value: 0.1 }, { id: 'ps-p2', name: 'severity', value: 3 }], capacities: [], position: { x: 400, y: 0 } },
      { id: 'ps-2', name: 'Hospital System', type: 'internal', parameters: [{ id: 'ps-p3', name: 'bed_usage', value: 60 }, { id: 'ps-p4', name: 'staff', value: 100 }], capacities: [{ id: 'ps-c1', name: 'beds', min: 0, max: 500 }], position: { x: 200, y: 150 } },
      { id: 'ps-3', name: 'ICU', type: 'internal', parameters: [{ id: 'ps-p5', name: 'occupancy', value: 40 }], capacities: [{ id: 'ps-c2', name: 'icu_beds', min: 0, max: 50 }], position: { x: 400, y: 150 } },
      { id: 'ps-4', name: 'Medical Supply', type: 'internal', parameters: [{ id: 'ps-p6', name: 'ppe_stock', value: 10000 }, { id: 'ps-p7', name: 'ventilators', value: 200 }], capacities: [{ id: 'ps-c3', name: 'warehouse', min: 0, max: 50000 }], position: { x: 600, y: 150 } },
      { id: 'ps-5', name: 'Workforce', type: 'internal', parameters: [{ id: 'ps-p8', name: 'available', value: 95 }, { id: 'ps-p9', name: 'remote_pct', value: 10 }], capacities: [], position: { x: 100, y: 350 } },
      { id: 'ps-6', name: 'Schools', type: 'internal', parameters: [{ id: 'ps-p10', name: 'open_pct', value: 100 }], capacities: [], position: { x: 300, y: 350 } },
      { id: 'ps-7', name: 'Small Business', type: 'internal', parameters: [{ id: 'ps-p11', name: 'revenue', value: 100 }, { id: 'ps-p12', name: 'survival_rate', value: 98 }], capacities: [], position: { x: 500, y: 350 } },
      { id: 'ps-8', name: 'Tourism', type: 'internal', parameters: [{ id: 'ps-p13', name: 'visitors', value: 100 }], capacities: [], position: { x: 700, y: 350 } },
      { id: 'ps-9', name: 'Government', type: 'internal', parameters: [{ id: 'ps-p14', name: 'lockdown_level', value: 0 }, { id: 'ps-p15', name: 'stimulus', value: 0 }], capacities: [], position: { x: 400, y: 500 } },
      { id: 'ps-10', name: 'Public Mood', type: 'internal', parameters: [{ id: 'ps-p16', name: 'compliance', value: 80 }, { id: 'ps-p17', name: 'anxiety', value: 20 }], capacities: [], position: { x: 200, y: 500 } },
      { id: 'ps-11', name: 'Food Supply', type: 'internal', parameters: [{ id: 'ps-p18', name: 'availability', value: 100 }], capacities: [{ id: 'ps-c4', name: 'storage', min: 0, max: 1000 }], position: { x: 600, y: 500 } },
      { id: 'ps-12', name: 'Transport', type: 'internal', parameters: [{ id: 'ps-p19', name: 'capacity', value: 100 }], capacities: [], position: { x: 0, y: 200 } },
      { id: 'ps-13', name: 'Pharma R&D', type: 'internal', parameters: [{ id: 'ps-p20', name: 'vaccine_progress', value: 0 }], capacities: [], position: { x: 800, y: 150 } },
      { id: 'ps-14', name: 'Media', type: 'external', parameters: [{ id: 'ps-p21', name: 'coverage', value: 50 }], capacities: [], position: { x: 0, y: 500 } },
      { id: 'ps-15', name: 'International Trade', type: 'external', parameters: [{ id: 'ps-p22', name: 'openness', value: 100 }], capacities: [], position: { x: 800, y: 350 } },
      { id: 'ps-16', name: 'Banking', type: 'internal', parameters: [{ id: 'ps-p23', name: 'lending', value: 100 }, { id: 'ps-p24', name: 'defaults', value: 2 }], capacities: [], position: { x: 700, y: 500 } },
      { id: 'ps-17', name: 'Real Estate', type: 'internal', parameters: [{ id: 'ps-p25', name: 'prices', value: 100 }], capacities: [], position: { x: 100, y: 650 } },
    ],
    chains: [
      { id: 'ps-ch1', name: 'Virus to Hospitals', chainType: 'inflicted', sourceId: 'ps-1', targetId: 'ps-2', stages: { potential: { id: 'ps-d1', expression: 'Virus_Spread_infection_rate > 0.05', type: 'existence' }, potentiality: { id: 'ps-d2', expression: 'Hospital_System_bed_usage < 100', type: 'susceptibility' }, actuality: { triggering: { id: 'ps-d3', expression: 'Virus_Spread_infection_rate > 0.2', type: 'triggering' }, consequences: [{ id: 'ps-x1', parameterId: 'ps-p3', function: '95', durationType: 'persistent' }] } } },
      { id: 'ps-ch2', name: 'Virus to Workforce', chainType: 'inflicted', sourceId: 'ps-1', targetId: 'ps-5', stages: { potential: { id: 'ps-d4', expression: 'Virus_Spread_infection_rate > 0.1', type: 'existence' }, potentiality: { id: 'ps-d5', expression: 'Workforce_available > 50', type: 'susceptibility' }, actuality: { triggering: { id: 'ps-d6', expression: 'Virus_Spread_infection_rate > 0.3', type: 'triggering' }, consequences: [{ id: 'ps-x2', parameterId: 'ps-p8', function: '60', durationType: 'persistent' }] } } },
      { id: 'ps-ch3', name: 'Government Lockdown to Schools', chainType: 'inflicted', sourceId: 'ps-9', targetId: 'ps-6', stages: { potential: { id: 'ps-d7', expression: 'Government_lockdown_level > 2', type: 'existence' }, potentiality: { id: 'ps-d8', expression: 'Schools_open_pct > 0', type: 'susceptibility' }, actuality: { triggering: { id: 'ps-d9', expression: 'Government_lockdown_level > 3', type: 'triggering' }, consequences: [{ id: 'ps-x3', parameterId: 'ps-p10', function: '0', durationType: 'persistent' }] } } },
      { id: 'ps-ch4', name: 'Lockdown to Tourism', chainType: 'inflicted', sourceId: 'ps-9', targetId: 'ps-8', stages: { potential: { id: 'ps-d10', expression: 'Government_lockdown_level > 1', type: 'existence' }, potentiality: { id: 'ps-d11', expression: 'Tourism_visitors > 0', type: 'susceptibility' }, actuality: { triggering: { id: 'ps-d12', expression: 'Government_lockdown_level > 2', type: 'triggering' }, consequences: [{ id: 'ps-x4', parameterId: 'ps-p13', function: '10', durationType: 'persistent' }] } } },
    ],
    scenario: {
      id: 'ps-scenario-1',
      name: 'Wave 1 Outbreak',
      forcedEvents: [
        { id: 'ps-ev1', componentId: 'ps-1', parameterId: 'ps-p1', value: 0.5, time: 1 },
        { id: 'ps-ev2', componentId: 'ps-1', parameterId: 'ps-p2', value: 7, time: 1 },
        { id: 'ps-ev3', componentId: 'ps-9', parameterId: 'ps-p14', value: 4, time: 3 },
        { id: 'ps-ev4', componentId: 'ps-14', parameterId: 'ps-p21', value: 100, time: 2 },
      ],
    },
    infoCards: [
      { id: 'ps-info-1', text: 'The virus acts as an external shock that cascades through healthcare, economy, and social systems.', position: { x: 380, y: -100 } },
      { id: 'ps-info-2', text: 'Government lockdown decisions create a second wave of economic cascades.', position: { x: 380, y: 630 } },
      { id: 'ps-info-3', text: 'Healthcare capacity is the critical bottleneck that drives policy responses.', position: { x: -20, y: 80 } },
    ],
  },
  {
    id: 'feedback-loop-chaos',
    title: 'Feedback Loop Chaos',
    description: 'A 14-node model with intentional feedback loops where effects circle back to amplify themselves, demonstrating chaotic cascade behavior.',
    difficulty: 'expert',
    nodeCount: 14,
    components: [
      { id: 'fl-1', name: 'Market Price', type: 'internal', parameters: [{ id: 'fl-p1', name: 'price', value: 100 }, { id: 'fl-p2', name: 'volatility', value: 5 }], capacities: [], position: { x: 400, y: 0 } },
      { id: 'fl-2', name: 'Demand', type: 'internal', parameters: [{ id: 'fl-p3', name: 'level', value: 100 }], capacities: [], position: { x: 200, y: 150 } },
      { id: 'fl-3', name: 'Supply', type: 'internal', parameters: [{ id: 'fl-p4', name: 'level', value: 100 }], capacities: [], position: { x: 600, y: 150 } },
      { id: 'fl-4', name: 'Speculation', type: 'internal', parameters: [{ id: 'fl-p5', name: 'intensity', value: 10 }], capacities: [], position: { x: 100, y: 300 } },
      { id: 'fl-5', name: 'Consumer Confidence', type: 'internal', parameters: [{ id: 'fl-p6', name: 'index', value: 80 }], capacities: [], position: { x: 300, y: 300 } },
      { id: 'fl-6', name: 'Production Cost', type: 'internal', parameters: [{ id: 'fl-p7', name: 'cost', value: 60 }], capacities: [], position: { x: 500, y: 300 } },
      { id: 'fl-7', name: 'Employment', type: 'internal', parameters: [{ id: 'fl-p8', name: 'rate', value: 95 }], capacities: [], position: { x: 700, y: 300 } },
      { id: 'fl-8', name: 'Central Bank', type: 'internal', parameters: [{ id: 'fl-p9', name: 'interest_rate', value: 2 }, { id: 'fl-p10', name: 'qe_amount', value: 0 }], capacities: [], position: { x: 400, y: 450 } },
      { id: 'fl-9', name: 'Inflation', type: 'internal', parameters: [{ id: 'fl-p11', name: 'rate', value: 2 }], capacities: [], position: { x: 200, y: 450 } },
      { id: 'fl-10', name: 'Housing', type: 'internal', parameters: [{ id: 'fl-p12', name: 'prices', value: 100 }], capacities: [], position: { x: 600, y: 450 } },
      { id: 'fl-11', name: 'Debt Level', type: 'internal', parameters: [{ id: 'fl-p13', name: 'total', value: 50 }], capacities: [], position: { x: 100, y: 600 } },
      { id: 'fl-12', name: 'Innovation', type: 'internal', parameters: [{ id: 'fl-p14', name: 'index', value: 70 }], capacities: [], position: { x: 700, y: 600 } },
      { id: 'fl-13', name: 'Global Trade', type: 'external', parameters: [{ id: 'fl-p15', name: 'volume', value: 100 }], capacities: [], position: { x: 0, y: 0 } },
      { id: 'fl-14', name: 'Energy Cost', type: 'external', parameters: [{ id: 'fl-p16', name: 'index', value: 100 }], capacities: [], position: { x: 800, y: 0 } },
    ],
    chains: [
      { id: 'fl-ch1', name: 'Price to Demand', chainType: 'inflicted', sourceId: 'fl-1', targetId: 'fl-2', stages: { potential: { id: 'fl-d1', expression: 'Market_Price_price > 120', type: 'existence' }, potentiality: { id: 'fl-d2', expression: 'Demand_level > 50', type: 'susceptibility' }, actuality: { triggering: { id: 'fl-d3', expression: 'Market_Price_price > 150', type: 'triggering' }, consequences: [{ id: 'fl-x1', parameterId: 'fl-p3', function: 'Demand_level * 0.7', durationType: 'persistent' }] } } },
      { id: 'fl-ch2', name: 'Demand to Price (Feedback)', chainType: 'inflicted', sourceId: 'fl-2', targetId: 'fl-1', stages: { potential: { id: 'fl-d4', expression: 'Demand_level < 80', type: 'existence' }, potentiality: { id: 'fl-d5', expression: 'Market_Price_price > 50', type: 'susceptibility' }, actuality: { triggering: { id: 'fl-d6', expression: 'Demand_level < 60', type: 'triggering' }, consequences: [{ id: 'fl-x2', parameterId: 'fl-p1', function: 'Market_Price_price * 0.8', durationType: 'persistent' }] } } },
      { id: 'fl-ch3', name: 'Price to Speculation', chainType: 'inflicted', sourceId: 'fl-1', targetId: 'fl-4', stages: { potential: { id: 'fl-d7', expression: 'Market_Price_volatility > 10', type: 'existence' }, potentiality: { id: 'fl-d8', expression: 'Speculation_intensity < 100', type: 'susceptibility' }, actuality: { triggering: { id: 'fl-d9', expression: 'Market_Price_volatility > 20', type: 'triggering' }, consequences: [{ id: 'fl-x3', parameterId: 'fl-p5', function: 'Market_Price_volatility * 3', durationType: 'persistent' }] } } },
      { id: 'fl-ch4', name: 'Confidence to Demand', chainType: 'inflicted', sourceId: 'fl-5', targetId: 'fl-2', stages: { potential: { id: 'fl-d10', expression: 'Consumer_Confidence_index < 60', type: 'existence' }, potentiality: { id: 'fl-d11', expression: 'Demand_level > 0', type: 'susceptibility' }, actuality: { triggering: { id: 'fl-d12', expression: 'Consumer_Confidence_index < 40', type: 'triggering' }, consequences: [{ id: 'fl-x4', parameterId: 'fl-p3', function: 'Demand_level * 0.6', durationType: 'persistent' }] } } },
    ],
    scenario: {
      id: 'fl-scenario-1',
      name: 'Market Shock',
      forcedEvents: [
        { id: 'fl-ev1', componentId: 'fl-1', parameterId: 'fl-p1', value: 200, time: 1 },
        { id: 'fl-ev2', componentId: 'fl-1', parameterId: 'fl-p2', value: 30, time: 1 },
        { id: 'fl-ev3', componentId: 'fl-14', parameterId: 'fl-p16', value: 200, time: 2 },
      ],
    },
    infoCards: [
      { id: 'fl-info-1', text: 'Price and Demand form a feedback loop — price drops reduce demand, which further drops price.', position: { x: 180, y: -80 } },
      { id: 'fl-info-2', text: 'Speculation amplifies volatility, creating chaotic behavior in the system.', position: { x: -20, y: 200 } },
      { id: 'fl-info-3', text: 'The Central Bank acts as a stabilizer, but its actions also feed back into the system.', position: { x: 380, y: 560 } },
    ],
  },
]
