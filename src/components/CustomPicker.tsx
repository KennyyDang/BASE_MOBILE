import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface PickerItem {
  label: string;
  value: string;
}

interface CustomPickerProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: PickerItem[];
  placeholder?: string;
  enabled?: boolean;
  style?: any;
}

const CustomPicker: React.FC<CustomPickerProps> = ({
  selectedValue,
  onValueChange,
  items,
  placeholder = 'Chọn...',
  enabled = true,
  style,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const selectedItem = items.find(item => item.value === selectedValue);
  const displayText = selectedItem?.label || placeholder;

  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelect = (value: string) => {
    onValueChange(value);
    setModalVisible(false);
    setSearchText('');
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, !enabled && styles.selectorDisabled, style]}
        onPress={() => enabled && setModalVisible(true)}
        disabled={!enabled}
        activeOpacity={0.7}
      >
        <Text 
          style={[
            styles.selectorText, 
            !selectedValue && styles.placeholderText,
            !enabled && styles.disabledText
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <MaterialIcons 
          name="arrow-drop-down" 
          size={24} 
          color={enabled ? COLORS.TEXT_SECONDARY : COLORS.BORDER} 
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchText('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            {items.length > 5 && (
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color={COLORS.TEXT_SECONDARY} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm..."
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <MaterialIcons name="clear" size={20} color={COLORS.TEXT_SECONDARY} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* List */}
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    item.value === selectedValue && styles.listItemSelected,
                  ]}
                  onPress={() => handleSelect(item.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.listItemText,
                      item.value === selectedValue && styles.listItemTextSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {item.label}
                  </Text>
                  {item.value === selectedValue && (
                    <MaterialIcons name="check" size={24} color={COLORS.PRIMARY} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
                </View>
              )}
              showsVerticalScrollIndicator={true}
              style={styles.list}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    backgroundColor: COLORS.SURFACE,
  },
  selectorDisabled: {
    backgroundColor: COLORS.BACKGROUND,
    opacity: 0.6,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
  placeholderText: {
    color: COLORS.TEXT_SECONDARY,
  },
  disabledText: {
    color: COLORS.TEXT_SECONDARY,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.7,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 8,
  },
  list: {
    maxHeight: Dimensions.get('window').height * 0.5,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER + '30',
  },
  listItemSelected: {
    backgroundColor: COLORS.PRIMARY + '10',
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
  listItemTextSelected: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default CustomPicker;
