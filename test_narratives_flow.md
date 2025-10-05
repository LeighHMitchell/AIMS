# Multilingual Narratives - Complete Flow Test

## Expected Data Flow

### 1. XML Input
```xml
<narrative>Name of Agency A</narrative>
<narrative xml:lang="fr">Nom de l'agence A</narrative>
```

### 2. Snippet Parser Output
Should produce:
```javascript
{
  narrative: "Name of Agency A",
  narrativeLang: "en",
  narratives: [
    { lang: "fr", text: "Nom de l'agence A" }
  ]
}
```

### 3. XmlImportTab Import Data
Should pass:
```javascript
{
  narrative: "Name of Agency A",
  narrativeLang: "en",
  narratives: [{ lang: "fr", text: "Nom de l'agence A" }]
}
```

### 4. API POST Request
Should send:
```javascript
{
  narrative: "Name of Agency A",
  narrative_lang: "en",
  narratives: [{ lang: "fr", text: "Nom de l'agence A" }]
}
```

### 5. Database Storage
Should store in JSONB:
```sql
narratives: '[{"lang":"fr","text":"Nom de l''agence A"}]'
```

### 6. API GET Response
Should return:
```javascript
{
  narrative: "Name of Agency A",
  narratives: [{ lang: "fr", text: "Nom de l'agence A" }]
}
```

### 7. Modal Display
Should show in "Multilingual Names" section:
- Language Code: fr
- Name: Nom de l'agence A

## Debug Checklist

Check each step:
- [ ] Snippet parser extracts both narratives
- [ ] XmlImportTab passes narratives array
- [ ] API receives narratives array
- [ ] Database stores narratives as JSONB
- [ ] API GET parses narratives from JSONB
- [ ] Modal receives narratives array
- [ ] Modal displays narratives in UI

