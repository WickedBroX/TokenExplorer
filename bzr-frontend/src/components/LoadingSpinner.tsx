export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <img 
        src="https://res.cloudinary.com/dhznjbcys/image/upload/v1762104033/loading_2_z6inrd.png" 
        alt="Loading..." 
        className="w-4 h-4 animate-spin"
      />
      <p className="mt-4 text-lg text-gray-600">Loading BZR Data...</p>
    </div>
  );
}