import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined'
import {
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material'
import AdminAddButton from './AdminAddButton'

/**
 * Barra de filtros globais do dashboard de análises.
 * Afeta KPIs, gráficos e lista de centrais.
 */
export default function AnalysisGlobalFilters({
  value,
  onChange,
  filterOptions = { centrals: [], tags: [], categories: [] },
  chartMode = 'volume',
  onChartModeChange,
  disabled = false
}) {
  const centrals = filterOptions.centrals || []
  const tags = filterOptions.tags || []
  const categories = filterOptions.categories || []

  const selectedCentrals = centrals.filter((central) => value.centralIds?.includes(central.id))
  const selectedTags = tags.filter((tag) => (value.tagNames || []).includes(tag.name))

  const update = (patch) => {
    onChange({ ...value, ...patch })
  }

  const handleClear = () => {
    onChange({
      fromDate: '',
      toDate: '',
      centralIds: [],
      tagIds: [],
      tagNames: [],
      category: ''
    })
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
            <Stack direction="row" spacing={1} alignItems="center">
              <FilterAltOutlinedIcon color="action" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>
                Filtros globais
              </Typography>
            </Stack>
            <AdminAddButton
              startIcon={<RestartAltOutlinedIcon fontSize="small" />}
              onClick={handleClear}
              disabled={disabled}
              size="small"
            >
              Limpar filtros
            </AdminAddButton>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ sm: 'flex-start' }}
            flexWrap="wrap"
            useFlexGap
          >
            <TextField
              label="Data inicial"
              type="date"
              size="small"
              value={value.fromDate || ''}
              onChange={(event) => update({ fromDate: event.target.value })}
              disabled={disabled}
              InputLabelProps={{ shrink: true }}
              inputProps={{ placeholder: '' }}
              sx={{
                minWidth: { xs: '100%', sm: 180 },
                ...(!value.fromDate
                  ? {
                      '& input::-webkit-datetime-edit': { color: 'transparent' },
                      '& input:focus::-webkit-datetime-edit': { color: 'inherit' }
                    }
                  : {})
              }}
            />
            <TextField
              label="Data final"
              type="date"
              size="small"
              value={value.toDate || ''}
              onChange={(event) => update({ toDate: event.target.value })}
              disabled={disabled}
              InputLabelProps={{ shrink: true }}
              inputProps={{ placeholder: '' }}
              sx={{
                minWidth: { xs: '100%', sm: 180 },
                ...(!value.toDate
                  ? {
                      '& input::-webkit-datetime-edit': { color: 'transparent' },
                      '& input:focus::-webkit-datetime-edit': { color: 'inherit' }
                    }
                  : {})
              }}
            />
          </Stack>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ md: 'flex-start' }}
            flexWrap="wrap"
            useFlexGap
          >
            <Autocomplete
              multiple
              size="small"
              options={centrals}
              value={selectedCentrals}
              disabled={disabled}
              disableCloseOnSelect
              getOptionLabel={(option) => option.name || ''}
              isOptionEqualToValue={(option, selected) => option.id === selected.id}
              onChange={(_, selected) => {
                update({ centralIds: selected.map((item) => item.id) })
              }}
              renderTags={(selected, getTagProps) =>
                selected.map((option, index) => (
                  <Chip {...getTagProps({ index })} key={option.id} label={option.name} size="small" />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Centrais" placeholder="Todas" />}
              sx={{ minWidth: { xs: '100%', md: 260 }, flex: 1 }}
            />

            <Autocomplete
              multiple
              size="small"
              options={tags}
              value={selectedTags}
              disabled={disabled}
              disableCloseOnSelect
              getOptionLabel={(option) => option.name || ''}
              isOptionEqualToValue={(option, selected) => option.name === selected.name}
              onChange={(_, selected) => {
                update({
                  tagNames: selected.map((item) => item.name),
                  tagIds: selected.flatMap((item) => item.ids || [])
                })
              }}
              renderTags={(selected, getTagProps) =>
                selected.map((option, index) => (
                  <Chip {...getTagProps({ index })} key={option.name} label={option.name} size="small" />
                ))
              }
              renderInput={(params) => <TextField {...params} label="Tags" placeholder="Todas" />}
              sx={{ minWidth: { xs: '100%', md: 220 }, flex: 1 }}
            />

            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }} disabled={disabled}>
              <InputLabel id="analysis-category-filter-label">Categoria</InputLabel>
              <Select
                labelId="analysis-category-filter-label"
                label="Categoria"
                value={value.category || ''}
                onChange={(event) => update({ category: event.target.value })}
              >
                <MenuItem value="">Todas as categorias</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {typeof onChartModeChange === 'function' ? (
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={chartMode === 'avgCollections'}
                    onChange={(event) =>
                      onChartModeChange(event.target.checked ? 'avgCollections' : 'volume')
                    }
                    disabled={disabled}
                  />
                }
                label="Mostrar nos gráficos a média mensal de coletas (em vez do volume total)"
              />
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  )
}
