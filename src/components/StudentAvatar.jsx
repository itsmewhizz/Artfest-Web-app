export default function StudentAvatar({ src, name, className = 'w-12 h-12' }) {
  const initial = (name || '?')[0].toUpperCase()
  return (
    <div className={`${className} rounded-full overflow-hidden flex-shrink-0`}>
      {src ? (
        <img
          src={src}
          alt={name || 'Student'}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none'
            e.target.nextSibling.style.display = 'flex'
          }}
        />
      ) : null}
      <div className={`w-full h-full bg-primary text-white font-bold flex items-center justify-center ${src ? 'hidden' : 'flex'}`}
        style={{ fontSize: parseInt(className.match(/\d+/)?.[0] || '12') * 0.4 + 'px' }}>
        {initial}
      </div>
    </div>
  )
}
