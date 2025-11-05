import { Users, ExternalLink } from 'lucide-react';

interface SocialLink {
  name: string;
  url: string;
  icon: 'twitter' | 'telegram' | 'discord' | 'website' | 'medium' | 'github' | 'email';
  color: string;
  bgColor: string;
  borderColor: string;
}

export const CommunityLinks: React.FC = () => {
  const socialLinks: SocialLink[] = [
    {
      name: 'Twitter',
      url: 'https://twitter.com/bazaars',
      icon: 'twitter',
      color: 'text-blue-600',
      bgColor: 'from-blue-50 to-white',
      borderColor: 'border-blue-100 hover:border-blue-300',
    },
    {
      name: 'Telegram',
      url: 'https://t.me/bazaars',
      icon: 'telegram',
      color: 'text-blue-500',
      bgColor: 'from-blue-50 to-white',
      borderColor: 'border-blue-100 hover:border-blue-300',
    },
    {
      name: 'Discord',
      url: 'https://discord.gg/bazaars',
      icon: 'discord',
      color: 'text-indigo-600',
      bgColor: 'from-indigo-50 to-white',
      borderColor: 'border-indigo-100 hover:border-indigo-300',
    },
    {
      name: 'Website',
      url: 'https://bazaars.app',
      icon: 'website',
      color: 'text-green-600',
      bgColor: 'from-green-50 to-white',
      borderColor: 'border-green-100 hover:border-green-300',
    },
    {
      name: 'Medium',
      url: 'https://medium.com/@bazaars',
      icon: 'medium',
      color: 'text-gray-700',
      bgColor: 'from-gray-50 to-white',
      borderColor: 'border-gray-100 hover:border-gray-300',
    },
    {
      name: 'GitHub',
      url: 'https://github.com/bazaars',
      icon: 'github',
      color: 'text-gray-900',
      bgColor: 'from-gray-50 to-white',
      borderColor: 'border-gray-100 hover:border-gray-300',
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
      case 'website':
        return (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        );
      case 'medium':
        return (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
          </svg>
        );
      case 'github':
        return (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
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
      case 'website':
        return 'bg-green-500';
      case 'medium':
        return 'bg-gray-700';
      case 'github':
        return 'bg-gray-900';
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
