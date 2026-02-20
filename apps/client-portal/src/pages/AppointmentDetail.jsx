import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Car, FileText, MessageCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useAppointment } from '@/hooks/useAppointments';
import { useUnreadMessageCount } from '@/hooks/useAppointmentMessages';
import { AppointmentChat } from '@/components/messaging';
import { formatDateTime, formatCurrency, cn } from '@/lib/utils';

export default function AppointmentDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('details');
  const { data: appointment, isLoading } = useAppointment(id);
  const { data: unreadData } = useUnreadMessageCount(id);
  const unreadCount = unreadData?.count || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Se incarca...</div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Programarea nu a fost gasita</p>
        <Link to="/appointments" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
          Inapoi la programari
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'details', label: 'Detalii', icon: FileText },
    { id: 'messages', label: 'Mesaje', icon: MessageCircle, badge: unreadCount },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/appointments">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{appointment.title}</h1>
          <p className="text-gray-500">Detalii programare</p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-600">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <Card className="h-[500px] flex flex-col">
          <CardHeader className="border-b border-gray-200 py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversatie cu echipa
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <AppointmentChat appointmentId={id} />
          </CardContent>
        </Card>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main info */}
        <Card>
          <CardHeader>
            <CardTitle>Informatii generale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Data si ora</p>
                <p className="font-medium">{formatDateTime(appointment.scheduledStart)}</p>
                {appointment.scheduledEnd && (
                  <p className="text-sm text-gray-500">
                    pana la {formatDateTime(appointment.scheduledEnd)}
                  </p>
                )}
              </div>
            </div>

            {appointment.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Locatie</p>
                  <p className="font-medium">{appointment.location}</p>
                </div>
              </div>
            )}

            {appointment.description && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Descriere</p>
                <p className="text-gray-700">{appointment.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle/Asset info */}
        {(appointment.vehicle || appointment.asset) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                {appointment.vehicle ? 'Vehicul' : 'Echipament'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointment.vehicle ? (
                <div className="space-y-2">
                  <p className="font-medium">
                    {appointment.vehicle.make} {appointment.vehicle.model}
                  </p>
                  <p className="text-gray-600">Numar: {appointment.vehicle.plateNumber}</p>
                  {appointment.vehicle.vin && (
                    <p className="text-sm text-gray-500">VIN: {appointment.vehicle.vin}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium">{appointment.asset.name}</p>
                  <p className="text-gray-600">Tip: {appointment.asset.type}</p>
                  {appointment.asset.serialNumber && (
                    <p className="text-sm text-gray-500">Serie: {appointment.asset.serialNumber}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Service order */}
        {appointment.serviceOrder && (
          <Card>
            <CardHeader>
              <CardTitle>Comanda de service</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointment.serviceOrder.lineItems?.map((item, index) => (
                  <div key={index} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{item.description}</p>
                      <p className="text-sm text-gray-500">Cantitate: {item.quantity}</p>
                    </div>
                    <p className="font-medium">{formatCurrency(Number(item.totalPrice))}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Related invoices */}
        {appointment.invoices?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Facturi asociate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {appointment.invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-gray-500">{formatCurrency(Number(invoice.total))}</p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      )}
    </div>
  );
}
