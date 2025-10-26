import React from 'react';
import { format } from 'date-fns';
import ChatButton from './ChatButton';

const CitizenComplaintCard = ({ complaint, user }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Accepted': return 'bg-blue-100 text-blue-800';
            case 'In Progress': return 'bg-purple-100 text-purple-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Expired': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getWasteTypeColor = (wasteType) => {
        switch (wasteType) {
            case 'Organic': return 'bg-green-100 text-green-800';
            case 'Plastic': return 'bg-blue-100 text-blue-800';
            case 'Construction': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-semibold mb-2">{complaint.title}</h3>
                    <p className="text-gray-600 mb-2">{complaint.description}</p>
                    
                    <div className="flex gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(complaint.status)}`}>
                            {complaint.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-sm ${getWasteTypeColor(complaint.waste_type)}`}>
                            {complaint.waste_type}
                        </span>
                        <span className="px-2 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                            {complaint.quantity}
                        </span>
                    </div>

                    <p className="text-sm text-gray-500">
                        Created: {format(new Date(complaint.created_at), 'PPP')}
                    </p>
                </div>

                <div className="flex gap-2">
                    <ChatButton 
                        complaintId={complaint.id}
                        username={user.username}
                        status={complaint.status}
                    />
                </div>
            </div>

            {complaint.picture && (
                <img 
                    src={complaint.picture}
                    alt="Complaint"
                    className="w-full h-48 object-cover rounded-lg mb-4"
                />
            )}
        </div>
    );
};

export default CitizenComplaintCard;