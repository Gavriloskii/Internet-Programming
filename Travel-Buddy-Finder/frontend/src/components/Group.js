import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroup, joinGroup, leaveGroup } from '../redux/groupSlice';
import { selectUser } from '../redux/userSlice';

const Group = () => {
    const { groupId } = useParams();
    const dispatch = useDispatch();
    const currentUser = useSelector(selectUser);
    const [group, setGroup] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);

    useEffect(() => {
        const loadGroup = async () => {
            setIsLoading(true);
            try {
                const response = await dispatch(fetchGroup(groupId)).unwrap();
                setGroup(response);
                setIsMember(response.members.includes(currentUser.id));
            } catch (error) {
                console.error('Failed to load group:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadGroup();
    }, [groupId, dispatch, currentUser.id]);

    const handleJoinGroup = async () => {
        try {
            await dispatch(joinGroup(groupId)).unwrap();
            setIsMember(true);
        } catch (error) {
            console.error('Failed to join group:', error);
        }
    };

    const handleLeaveGroup = async () => {
        try {
            await dispatch(leaveGroup(groupId)).unwrap();
            setIsMember(false);
        } catch (error) {
            console.error('Failed to leave group:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {group?.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                {group?.description}
            </p>

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Members: {group?.members.length}
                    </h2>
                </div>
                <button
                    onClick={isMember ? handleLeaveGroup : handleJoinGroup}
                    className={`px-4 py-2 rounded-lg ${
                        isMember ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                    } hover:bg-opacity-80 transition-colors`}
                >
                    {isMember ? 'Leave Group' : 'Join Group'}
                </button>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Group Members
            </h2>
            <ul className="space-y-2">
                {group?.members.map(member => (
                    <li key={member.id} className="flex items-center space-x-2">
                        <img
                            src={member.avatar || 'https://via.placeholder.com/40'}
                            alt={member.name}
                            className="w-10 h-10 rounded-full"
                        />
                        <span className="text-gray-900 dark:text-white">{member.name}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Group;
