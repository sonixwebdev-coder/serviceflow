import { Mail, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Contact</h1>
      <p className="text-gray-500 mb-8">
        Ai intrebari sau ai nevoie de ajutor? Ne poti contacta prin oricare dintre canalele de mai jos.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Email</h3>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              Trimite-ne un email si iti vom raspunde in cel mai scurt timp.
            </p>
            <a
              href="mailto:contact@serviceflow.ro"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              contact@serviceflow.ro
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Adresa</h3>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              Sediul nostru este in Romania.
            </p>
            <p className="text-sm text-gray-600">
              Bucuresti, Romania
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 p-6 bg-primary-50 rounded-2xl text-center">
        <h2 className="text-lg font-semibold text-gray-900">Program de suport</h2>
        <p className="mt-2 text-sm text-gray-500">
          Luni - Vineri: 09:00 - 18:00
        </p>
        <p className="text-sm text-gray-500">
          Raspundem la email-uri in maxim 24 de ore lucratoare.
        </p>
      </div>
    </div>
  );
}
