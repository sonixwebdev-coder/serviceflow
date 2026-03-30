import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useForgotPassword } from '@/hooks/useAuth';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalid'),
});

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const forgotPasswordMutation = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data) => {
    forgotPasswordMutation.mutate(data.email, {
      onSuccess: () => setSubmitted(true),
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="card p-5 sm:p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Verifica email-ul</h2>
              <p className="mt-2 text-gray-500">
                Daca exista un cont cu aceasta adresa de email, vei primi un link pentru resetarea parolei.
              </p>
            </div>
            <Link to="/login">
              <Button variant="secondary" className="w-full">
                <ArrowLeft className="h-4 w-4" />
                Inapoi la autentificare
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-600">Portal Client</h1>
          <h2 className="mt-3 sm:mt-4 text-xl sm:text-2xl font-semibold text-gray-900">Ai uitat parola?</h2>
          <p className="mt-2 text-sm text-gray-500">
            Introdu adresa de email si iti vom trimite un link pentru resetarea parolei.
          </p>
        </div>

        <div className="card p-5 sm:p-8">
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {forgotPasswordMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {forgotPasswordMutation.error?.response?.data?.message || 'Eroare la trimiterea email-ului'}
            </div>
          )}

          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="email@exemplu.ro"
                className="pl-10"
                error={errors.email}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={forgotPasswordMutation.isPending}
          >
            Trimite link de resetare
          </Button>

          <div className="text-center">
            <Link to="/login" className="text-sm text-primary-600 hover:text-primary-500">
              Inapoi la autentificare
            </Link>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
