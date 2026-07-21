import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { FacebookIcon, InstagramIcon, LinkedinIcon } from '@/components/icons/BrandIcons';
import { getFileUrl } from '@/utils/api';

const TeamGridBlock = ({ data, settings, isEditing = false, onClick, crmData = [] }) => {
  const {
    title = 'Echipa noastra',
    subtitle = '',
    autoSync = false,
    members = [],
    columns = 3,
    showBio = true,
    showSocial = true,
  } = data || {};

  const {
    backgroundColor = '#ffffff',
    textColor = '#1f2937',
    padding = { top: 60, bottom: 60 },
    maxWidth = 'xl',
  } = settings || {};

  // Use CRM data if autoSync is enabled, otherwise use manual members
  const displayMembers = autoSync ? crmData : members;

  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div
      className={cn(
        'w-full px-6',
        isEditing && 'cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2'
      )}
      style={{
        backgroundColor,
        paddingTop: `${padding.top}px`,
        paddingBottom: `${padding.bottom}px`,
      }}
      onClick={onClick}
    >
      <div className={cn('mx-auto', maxWidthClasses[maxWidth])}>
        {/* Header */}
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2 className="text-3xl font-bold mb-4" style={{ color: textColor }}>
                {title}
              </h2>
            )}
            {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
          </div>
        )}

        {/* Team Grid */}
        <div className={cn('grid gap-8', columnClasses[columns] || columnClasses[3])}>
          {displayMembers.length > 0 ? (
            displayMembers.map((member, index) => (
              <div
                key={member.id || index}
                className="bg-white rounded-lg border shadow-xs text-center p-6"
              >
                {/* Avatar */}
                <div className="mx-auto w-32 h-32 rounded-full overflow-hidden mb-4 bg-gray-100">
                  {member.image ? (
                    <img
                      src={getFileUrl(member.image)}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Name & Role */}
                <h3 className="text-lg font-semibold" style={{ color: textColor }}>
                  {member.name}
                </h3>
                {member.role && <p className="text-sm text-gray-500 mb-2">{member.role}</p>}

                {/* Bio */}
                {showBio && member.bio && (
                  <p className="text-sm text-gray-600 mt-3">{member.bio}</p>
                )}

                {/* Social Links */}
                {showSocial && member.socialLinks && (
                  <div className="flex justify-center gap-3 mt-4">
                    {member.socialLinks.facebook && (
                      <a
                        href={member.socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <FacebookIcon className="h-5 w-5" />
                      </a>
                    )}
                    {member.socialLinks.instagram && (
                      <a
                        href={member.socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-pink-600"
                      >
                        <InstagramIcon className="h-5 w-5" />
                      </a>
                    )}
                    {member.socialLinks.linkedin && (
                      <a
                        href={member.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-700"
                      >
                        <LinkedinIcon className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              {autoSync ? 'Nu exista membri in echipa' : 'Adaugati membri din setari'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const teamGridBlockDefaults = {
  title: 'Echipa noastra',
  subtitle: 'Profesionisti dedicati pentru dvs.',
  autoSync: false,
  members: [],
  columns: 3,
  showBio: true,
  showSocial: true,
};

export default TeamGridBlock;
