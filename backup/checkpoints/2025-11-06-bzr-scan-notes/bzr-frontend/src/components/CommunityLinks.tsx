import { Users, ExternalLink } from 'lucide-react';

interface SocialLink {
  name: string;
  url: string;
  icon: 'twitter' | 'telegram' | 'discord' | 'medium' | 'facebook' | 'instagram';
  color: string;
  bgColor: string;
  borderColor: string;
}

export const CommunityLinks: React.FC = () => {
  const socialLinks: SocialLink[] = [
    {
      name: 'Twitter',
      url: 'https://twitter.com/BazaarsBzr',
      icon: 'twitter',
      color: 'text-blue-600',
      bgColor: 'from-blue-50 to-white',
      borderColor: 'border-blue-100 hover:border-blue-300',
    },
    {
      name: 'Discord',
      url: 'https://discord.gg/bazaars-bzr-979586323688087552',
      icon: 'discord',
      color: 'text-indigo-600',
      bgColor: 'from-indigo-50 to-white',
      borderColor: 'border-indigo-100 hover:border-indigo-300',
    },
    {
      name: 'Telegram',
      url: 'https://t.me/BazaarsOfficial',
      icon: 'telegram',
      color: 'text-blue-500',
      bgColor: 'from-blue-50 to-white',
      borderColor: 'border-blue-100 hover:border-blue-300',
    },
    {
      name: 'Medium',
      url: 'https://medium.com/@BazaarsBzr',
      icon: 'medium',
      color: 'text-gray-700',
      bgColor: 'from-gray-50 to-white',
      borderColor: 'border-gray-100 hover:border-gray-300',
    },
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/Bazaarsapp/',
      icon: 'facebook',
      color: 'text-blue-700',
      bgColor: 'from-blue-50 to-white',
      borderColor: 'border-blue-100 hover:border-blue-300',
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/bazaars.app/',
      icon: 'instagram',
      color: 'text-pink-600',
      bgColor: 'from-pink-50 to-white',
      borderColor: 'border-pink-100 hover:border-pink-300',
    },
  ];

  const renderIcon = (icon: string) => {
    switch (icon) {
      case 'twitter':
        return (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
          </svg>
        );
      case 'telegram':
        return (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
          </svg>
        );
      case 'discord':
        return (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        );
      case 'medium':
        return (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
          </svg>
        );
      case 'facebook':
        return (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        );
      case 'instagram':
        return (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getIconBgColor = (icon: string) => {
    switch (icon) {
      case 'twitter':
        return 'bg-blue-500';
      case 'telegram':
        return 'bg-blue-400';
      case 'discord':
        return 'bg-indigo-600';
      case 'medium':
        return 'bg-gray-700';
      case 'facebook':
        return 'bg-blue-700';
      case 'instagram':
        return 'bg-pink-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-lg p-4 md:p-6 border border-gray-100">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
        <h3 className="text-base md:text-lg font-semibold text-gray-900">Community</h3>
      </div>

      {/* Description */}
      <p className="text-xs md:text-sm text-gray-500 mb-4">
        Connect with the Bazaars community across platforms
      </p>

      {/* Links Grid */}
      <div className="space-y-2">
        {socialLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-center justify-between p-2.5 md:p-3 rounded-lg bg-gradient-to-r ${link.bgColor} border ${link.borderColor} transition-all duration-200 hover:shadow-md`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${getIconBgColor(link.icon)} flex items-center justify-center shadow-sm`}>
                {renderIcon(link.icon)}
              </div>
              <span className={`text-sm font-medium text-gray-900 group-hover:${link.color} transition-colors`}>
                {link.name}
              </span>
            </div>
            <ExternalLink className={`w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:${link.color} transition-colors`} />
          </a>
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          Stay updated with the latest news and announcements
        </p>
      </div>
    </div>
  );
};
