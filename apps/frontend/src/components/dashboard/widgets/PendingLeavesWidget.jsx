import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { ChevronRight, Check } from 'lucide-react';
import useLeaveRequests from '../../../hooks/useLeaveRequests';
import { LEAVE_STATUS, LEAVE_TYPE } from '../../../utils/constants';

const LEAVE_TYPE_LABELS = {
  [LEAVE_TYPE.VACATION]: 'Concediu',
  [LEAVE_TYPE.SICK]: 'Medical',
  [LEAVE_TYPE.PERSONAL]: 'Personal',
  [LEAVE_TYPE.UNPAID]: 'Neplătit',
  [LEAVE_TYPE.MEDICAL]: 'Medical',
};

const ListSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
        <div className="flex-1 space-y-1">
          <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-40 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    ))}
  </div>
);

export default function PendingLeavesWidget() {
  const navigate = useNavigate();
  const { leaveRequests, loading } = useLeaveRequests();

  const pendingRequests = (leaveRequests || [])
    .filter((req) => req.status === LEAVE_STATUS.PENDING)
    .slice(0, 5);

  if (loading) {
    return <ListSkeleton />;
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <p className="font-medium text-gray-900">Nicio cerere in asteptare</p>
        <p className="text-sm text-gray-500 mt-1">Toate cererile sunt procesate</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pendingRequests.map((request) => (
        <div
          key={request._id}
          onClick={() => navigate('/leaves')}
          className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 cursor-pointer transition"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-200 text-yellow-700 flex items-center justify-center text-sm font-semibold">
            {request.employee?.firstName?.[0] || '?'}
            {request.employee?.lastName?.[0] || ''}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {request.employee?.firstName} {request.employee?.lastName}
            </p>
            <p className="text-xs text-gray-600">
              {request.totalDays} {request.totalDays === 1 ? 'zi' : 'zile'} ·{' '}
              {LEAVE_TYPE_LABELS[request.leaveType] || request.leaveType}
            </p>
          </div>
          {request.startDate && (
            <span className="text-xs text-gray-500 flex-shrink-0">
              {format(parseISO(request.startDate), 'dd MMM', { locale: roDateLocale })}
            </span>
          )}
        </div>
      ))}

      <button
        onClick={() => navigate('/leaves')}
        className="w-full text-center text-sm text-primary hover:text-orange-600 font-medium py-2 flex items-center justify-center gap-1"
      >
        Gestioneaza cereri <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
