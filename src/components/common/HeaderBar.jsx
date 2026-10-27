import React from 'react';
import { Link } from 'react-router-dom';
import { useUserProfile } from '../../context/useUserProfile';

export function HeaderBar({
  title,
  subtitle,
  children,
  avatarSrc,
  showAvatar = true
}) {
  const { profile } = useUserProfile();
  const effectiveAvatar = avatarSrc || profile?.avatar || '/atelier/user_avatar.jpg';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0EBE1]">
      <div className="flex items-center gap-3.5">
        {showAvatar && (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-[#D5DFD5] shadow-xs shrink-0 bg-white">
            <img
              src={effectiveAvatar}
              alt="User Atelier Avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/atelier/user_avatar.jpg';
              }}
            />
          </div>
        )}
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#143823] tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#5C665F] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {children && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {children}
        </div>
      )}
    </div>
  );
}
