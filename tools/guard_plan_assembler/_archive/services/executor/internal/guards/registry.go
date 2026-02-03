package guards

// PhaseGuards returns the list of guards that must run after a given phase completes.
// Keep this registry small and explicit to preserve determinism.
func PhaseGuards(phase int) []Guard {
	switch phase {
	case 1:
		return []Guard{
			&RequestSizeLimit{MaxBytes: DefaultMaxRequestBytes},
			&RequestSchemaV1Validate{},
			&RequestSchemaVersionRequired{},
			&RequestKindRequired{},
			&Phase01OutputStatusOK{},
		}
	case 3:
		return []Guard{
			&Phase03ZipRootPathExists{},
		}
	case 4:
		return []Guard{
			&Phase04ManifestNonEmpty{},
		}
	case 5:
		return []Guard{
			&Phase05DocsParsedNonZero{},
		}
	case 6:
		return []Guard{
			&Phase06ArtifactsWritten{},
		}
	default:
		return []Guard{}
	}
}
