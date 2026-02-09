import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { websiteService } from '@/services/websiteService';

function SkeletonMember() {
  return (
    <div className="text-center bg-white rounded-xl p-6 animate-pulse">
      <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full mx-auto bg-gray-200 mb-4" />
      <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
    </div>
  );
}

export default function TeamGridBlock({ data, subdomain, branding }) {
  const {
    title,
    subtitle,
    autoSync = true,
    members: staticMembers = [],
    columns = 4,
    showBio = false,
    showSocial = false,
  } = data;

  const primaryColor = branding?.primaryColor || '#2563eb';

  // Fetch team from CRM if autoSync is enabled
  const { data: crmMembers, isLoading, isError } = useQuery({
    queryKey: ['crm-team', subdomain],
    queryFn: () => websiteService.getCrmData(subdomain, 'team'),
    enabled: autoSync,
  });

  const members = autoSync ? (crmMembers || []) : staticMembers;

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  };

  return (
    <div>
      {(title || subtitle) && (
        <div className="text-center mb-10">
          {title && <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>}
          {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
        </div>
      )}

      {autoSync && isLoading ? (
        <div className={cn('grid gap-8', gridCols[columns] || gridCols[4])}>
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonMember key={i} />
          ))}
        </div>
      ) : autoSync && isError ? (
        <p className="text-center text-gray-500">Nu s-au putut incarca membrii echipei. Incercati mai tarziu.</p>
      ) : members.length === 0 ? (
        <p className="text-center text-gray-500">Nu exista membri ai echipei.</p>
      ) : (
        <div className={cn('grid gap-8', gridCols[columns] || gridCols[4])}>
          {members.map((member, index) => (
            <div
              key={member.id || index}
              className="text-center group bg-white rounded-xl p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="mb-4">
                {member.avatar || member.profileImage ? (
                  <img
                    src={member.avatar || member.profileImage}
                    alt={member.name || `${member.firstName} ${member.lastName}`}
                    className="w-32 h-32 lg:w-40 lg:h-40 rounded-full mx-auto object-cover ring-4 ring-gray-100 group-hover:ring-opacity-50 transition-all duration-300"
                    style={{ '--tw-ring-color': `${primaryColor}30` }}
                  />
                ) : (
                  <div
                    className="w-32 h-32 lg:w-40 lg:h-40 rounded-full mx-auto flex items-center justify-center ring-4 ring-gray-100"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <span className="text-4xl font-semibold" style={{ color: primaryColor }}>
                      {(member.name || member.firstName || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {member.name || `${member.firstName} ${member.lastName}`}
              </h3>
              {member.role && (
                <p className="text-sm font-medium mt-1" style={{ color: primaryColor }}>
                  {member.role}
                </p>
              )}
              {showBio && member.bio && (
                <p className="mt-3 text-gray-600 text-sm leading-relaxed">{member.bio}</p>
              )}
              {showSocial && member.social && (
                <div className="mt-4 flex justify-center gap-3">
                  {member.social.facebook && (
                    <a
                      href={member.social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      Facebook
                    </a>
                  )}
                  {member.social.instagram && (
                    <a
                      href={member.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-pink-600 transition-colors"
                    >
                      Instagram
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
