import { localizeRegionName } from '@/constants/regions';

type TFn = (key: any) => string;

interface NotifMeta {
  employeeName?: string;
  storeName?: string;
  date?: string;
  comment?: string;
  reason?: string;
  regionName?: string;
  requiresRevisit?: boolean;
}

function parseMeta(metadataJson: string | null | undefined): NotifMeta | null {
  if (!metadataJson) return null;
  try { return JSON.parse(metadataJson); } catch { return null; }
}

function r(template: string, meta: NotifMeta): string {
  return template
    .replace('{name}', meta.employeeName ?? '')
    .replace('{store}', meta.storeName ?? '')
    .replace('{date}', meta.date ?? '')
    .replace('{region}', meta.regionName ?? '')
    .replace('{comment}', meta.comment ?? '')
    .replace('{reason}', meta.reason ?? '');
}

export function translateNotifTitle(type: string, fallback: string, t: TFn): string {
  const key = 'notif.title.' + type;
  const val = t(key as any);
  return val !== key ? val : fallback;
}

export function translateNotifBody(
  type: string,
  metadataJson: string | null | undefined,
  fallback: string,
  t: TFn,
  language?: string,
): string {
  const meta = parseMeta(metadataJson);
  if (!meta) return fallback;

  // Localize region name if present
  if (meta.regionName && language) {
    meta.regionName = localizeRegionName(meta.regionName, language);
  }

  switch (type) {
    case 'VisitApproved':
      return meta.comment
        ? r(t('notif.body.visitApprovedComment' as any), meta)
        : r(t('notif.body.visitApproved' as any), meta);

    case 'VisitRejected': {
      let msg = r(t('notif.body.visitRejected' as any), meta);
      if (meta.comment) msg += ` "${meta.comment}"`;
      if (meta.requiresRevisit) msg += t('notif.body.visitRejectedRevisit' as any);
      return msg;
    }

    case 'VisitSubmitted':
      return r(t('notif.body.visitSubmitted' as any), meta);

    case 'ScheduleCreated':
      return r(t('notif.body.scheduleCreated' as any), meta);

    case 'ScheduleCancelled':
      return r(t('notif.body.scheduleCancelled' as any), meta);

    case 'ScheduleMissed':
      // Admin notification has employeeName, employee notification doesn't
      return meta.employeeName
        ? r(t('notif.body.scheduleMissedAdmin' as any), meta)
        : r(t('notif.body.scheduleMissedEmp' as any), meta);

    case 'EmployeeCommentAdded':
      return r(t('notif.body.employeeCommentAdded' as any), meta);

    case 'AdminCommentAdded':
      return r(t('notif.body.adminCommentAdded' as any), meta);

    case 'NewRegistrationRequest':
      return r(t('notif.body.newRegistrationRequest' as any), meta);

    case 'RegistrationApproved':
      return t('notif.body.registrationApproved' as any);

    case 'RegistrationRejected':
      return r(t('notif.body.registrationRejected' as any), meta);

    default:
      return fallback;
  }
}
