import { useState, useEffect } from 'react';
import parentProfileService, { ParentProfile } from '../services/parentProfileService';

/**
 * Hook for managing parent profile data
 */
export const useParentProfile = () => {
  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all parents for current user's family
   */
  const fetchParents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await parentProfileService.getMyParents();
      setParents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch parents');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update parent profile
   */
  const updateParent = async (parentId: string, updateData: Partial<ParentProfile>) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedParent = await parentProfileService.updateParentProfile(parentId, updateData);
      
      // Update local state
      setParents(prev => 
        prev.map(parent => 
          parent.id === parentId ? updatedParent : parent
        )
      );
      
      return updatedParent;
    } catch (err: any) {
      setError(err.message || 'Failed to update parent');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get parent by ID from local state
   */
  const getParentById = (parentId: string): ParentProfile | undefined => {
    return parents.find(parent => parent.id === parentId);
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchParents();
  }, []);

  return {
    parents,
    loading,
    error,
    fetchParents,
    updateParent,
    getParentById,
    refetch: fetchParents,
  };
};
