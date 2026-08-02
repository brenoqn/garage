import { Procedure } from '../../../core/models/procedure.model';
import { BATTERY_CHECK_PROCEDURE } from './battery-check.procedure';
import { BRAKE_INSPECTION_PROCEDURE } from './brake-inspection.procedure';
import { CHAIN_MAINTENANCE_PROCEDURE } from './chain-maintenance.procedure';
import { CLUTCH_CABLE_PROCEDURE } from './clutch-cable.procedure';
import { OIL_CHANGE_PROCEDURE } from './oil-change.procedure';
import { SPARK_PLUG_INSPECTION_PROCEDURE } from './spark-plug-inspection.procedure';

export const NX200_PROCEDURES: readonly Procedure[] = [
  OIL_CHANGE_PROCEDURE,
  CHAIN_MAINTENANCE_PROCEDURE,
  SPARK_PLUG_INSPECTION_PROCEDURE,
  BATTERY_CHECK_PROCEDURE,
  CLUTCH_CABLE_PROCEDURE,
  BRAKE_INSPECTION_PROCEDURE,
];
