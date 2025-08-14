import { useNavigate } from 'react-router';

const AdminActions = () => {
    const navigate = useNavigate();

    const handleClearAllData = () => {
        if (confirm('Are you sure you want to clear ALL resume data? This action cannot be undone.')) {
            navigate('/wipe');
        }
    };

    return (
        <div className="p-6 bg-gray-50 rounded-lg border-2 border-red-200">
            <h3 className="text-lg font-semibold text-red-700 mb-4">⚠️ Admin Actions</h3>
            
            <div>
                <button
                    onClick={handleClearAllData}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium"
                >
                    Clear All Resume Data
                </button>
                <p className="text-sm text-gray-600 mt-1">
                    Clears all resume files and data from Puter cloud storage
                </p>
            </div>
        </div>
    );
};

export default AdminActions;
