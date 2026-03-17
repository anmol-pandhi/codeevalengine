import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function useUserId() {
  const [userId] = useState(() => {
    let id = localStorage.getItem('judge_user_id');
    if (!id) {
      id = `user_${uuidv4().slice(0, 8)}`;
      localStorage.setItem('judge_user_id', id);
    }
    return id;
  });
  return userId;
}
