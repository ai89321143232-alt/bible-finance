import React from 'react';

// Аватар участника семьи: фото (avatar_url) с фолбэком на цветной круг с первой буквой.
export default function MemberAvatar({ member, size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-base';
  const initial = (member.display_name || member.name)?.[0]?.toUpperCase() || '?';

  if (member.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt={member.display_name || member.name}
        className={`${sizeClasses} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ backgroundColor: member.avatar_color || '#8B5CF6' }}
    >
      {initial}
    </div>
  );
}