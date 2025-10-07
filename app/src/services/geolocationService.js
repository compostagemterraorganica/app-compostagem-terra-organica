import * as Location from 'expo-location';
import { getConfig } from '../config/environment';

export const geolocationService = {
  // Solicitar permissão de localização
  async requestLocationPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permissão de localização negada');
      }
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Obter localização atual
  async getCurrentLocation() {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Permissão de localização necessária');
      }

      const accuracyMap = {
        low: Location.Accuracy.Low,
        balanced: Location.Accuracy.Balanced,
        high: Location.Accuracy.High,
        highest: Location.Accuracy.Highest
      };

      const location = await Location.getCurrentPositionAsync({
        accuracy: accuracyMap[getConfig('LOCATION_ACCURACY')] || Location.Accuracy.High,
        maximumAge: getConfig('LOCATION_MAX_AGE'),
        timeout: getConfig('LOCATION_TIMEOUT')
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp
      };
    } catch (error) {
      throw error;
    }
  },

  // Obter endereço a partir das coordenadas
  async getAddressFromCoords(latitude, longitude) {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        return {
          street: address.street || '',
          city: address.city || '',
          region: address.region || '',
          country: address.country || '',
          postalCode: address.postalCode || '',
          formattedAddress: `${address.street || ''}, ${address.city || ''}, ${address.region || ''}`.trim()
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  // Obter dados completos de localização
  async getLocationData() {
    try {
      const location = await this.getCurrentLocation();
      const address = await this.getAddressFromCoords(location.latitude, location.longitude);

      return {
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        },
        address: address,
        timestamp: new Date().toISOString(),
        formattedLocation: this.formatLocationString(location.latitude, location.longitude, address)
      };
    } catch (error) {
      throw error;
    }
  },

  // Formatar string de localização para marca d'água
  formatLocationString(latitude, longitude, address = null) {
    const lat = latitude.toFixed(6);
    const lng = longitude.toFixed(6);
    
    if (address && address.formattedAddress) {
      return `${lat}, ${lng} - ${address.formattedAddress}`;
    }
    
    return `${lat}, ${lng}`;
  }
};
