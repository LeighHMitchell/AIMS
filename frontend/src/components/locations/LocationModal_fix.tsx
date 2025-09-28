  // Initialize form with existing location data
  useEffect(() => {
    if (location) {
      reset({
        ...location,
        latitude: location.latitude || undefined,
        longitude: location.longitude || undefined,
      } as LocationFormSchema);

      if (location.latitude && location.longitude) {
        setMarkerPosition([location.latitude, location.longitude]);
        setMapCenter([location.latitude, location.longitude]);
        setMapZoom(15);
      }

      setSelectedLocation(location);
    } else {
      // Reset to defaults for new location
      const defaults = getDefaultLocationValues('site');
      reset({
        ...defaults,
      } as LocationFormSchema);
      setSelectedLocation({});
      setMarkerPosition(null);
      setMapCenter(DEFAULT_CENTER);
      setMapZoom(DEFAULT_ZOOM);
    }
  }, [location, reset]);

  // Reset form when modal opens for new location
  useEffect(() => {
    if (isOpen && !location) {
      // Force reset to defaults when modal opens for new location
      const defaults = getDefaultLocationValues('site');
      reset({
        ...defaults,
      } as LocationFormSchema);
      setSelectedLocation({});
      setMarkerPosition(null);
      setMapCenter(DEFAULT_CENTER);
      setMapZoom(DEFAULT_ZOOM);
      setValidationErrors({});
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, location, reset]);

  // Default toggle on for map auto-population
