import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import './MatchNotification.css';

const MatchNotification = ({ match, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="match-notification">
      <div className="match-notification-content">
        <div className="match-notification-header">
          <h3>New Match! 🎉</h3>
          <button className="close-button" onClick={handleClose}>&times;</button>
        </div>
        <div className="match-notification-body">
          <p>You matched with {match.userName}!</p>
          <p className="match-score">Match Score: {match.matchScore}%</p>
        </div>
        <div className="match-notification-footer">
          <button className="view-profile-btn" onClick={() => {
            // Navigate to match profile or chat
            window.location.href = `/matches/${match.matchId}`;
            handleClose();
          }}>
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchNotification;
