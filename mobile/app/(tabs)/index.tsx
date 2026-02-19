// import { Image } from 'expo-image';
// import { Platform, StyleSheet, View } from 'react-native';

// import { HelloWave } from '@/components/hello-wave';
// import ParallaxScrollView from '@/components/parallax-scroll-view';
// import { ThemedText } from '@/components/themed-text';
// import { ThemedView } from '@/components/themed-view';
// import { Link } from 'expo-router';

// export default function HomeScreen() {
//   return (
//     <ParallaxScrollView
//       headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
//       headerImage={
//         <Image
//           source={require('@/assets/images/partial-react-logo.png')}
//           style={styles.reactLogo}
//         />
//       }
//     >
//       {/* Header row */}
//       <ThemedView style={styles.titleContainer}>
//         <ThemedText type="title">Hi Loretta!</ThemedText>
//         <HelloWave />
//       </ThemedView>

//       {/* Brand / wordmark placeholder (kept minimal; uses existing image area) */}
//       <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
//         {/* If you add a wordmark later, replace the source below */}
//         <Image
//           source={require('@/assets/images/react-logo.png')}
//           style={styles.wordmark}
//         />
//       </View>

//       {/* Current Session */}
//       <ThemedView style={styles.sectionBlock}>
//         <ThemedText type="subtitle">Your Current Session</ThemedText>

//         <View style={styles.card}>
//           <Image
//             source={require('@/assets/images/react-logo.png')}
//             style={styles.cardImage}
//           />
//           <View style={styles.cardBody}>
//             <ThemedText type="defaultSemiBold">Session 2</ThemedText>
//             <ThemedText>3 Exercises</ThemedText>
//           </View>
//         </View>

//         {/* Accent line */}
//         <View style={styles.accentLine} />
//       </ThemedView>

//       {/* Previous Sessions */}
//       <ThemedView style={styles.sectionBlock}>
//         <ThemedText type="subtitle">Previous Sessions</ThemedText>

//         <View style={styles.card}>
//           <Image
//             source={require('@/assets/images/react-logo.png')}
//             style={styles.cardImage}
//           />
//           <View style={styles.cardBody}>
//             <ThemedText type="defaultSemiBold">Session 1</ThemedText>
//             <ThemedText>3 Exercises</ThemedText>
//           </View>
//         </View>
//       </ThemedView>

//       {/* (Kept from your original file so behavior stays the same) */}
//       <ThemedView style={styles.stepContainer}>
//         <Link href="/modal">
//           <Link.Trigger>
//             <ThemedText type="subtitle">More</ThemedText>
//           </Link.Trigger>
//           <Link.Preview />
//           <Link.Menu>
//             <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
//             <Link.MenuAction
//               title="Share"
//               icon="square.and.arrow.up"
//               onPress={() => alert('Share pressed')}
//             />
//             <Link.Menu title="More" icon="ellipsis">
//               <Link.MenuAction
//                 title="Delete"
//                 icon="trash"
//                 destructive
//                 onPress={() => alert('Delete pressed')}
//               />
//             </Link.Menu>
//           </Link.Menu>
//         </Link>

//         <ThemedText>
//           {`Press `}
//           <ThemedText type="defaultSemiBold">
//             {Platform.select({ ios: 'cmd + d', android: 'cmd + m', web: 'F12' })}
//           </ThemedText>
//           {` to open developer tools.`}
//         </ThemedText>
//       </ThemedView>
//     </ParallaxScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   titleContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 4,
//   },
//   stepContainer: {
//     gap: 8,
//     marginTop: 12,
//     marginBottom: 8,
//   },
//   reactLogo: {
//     height: 178,
//     width: 290,
//     bottom: 0,
//     left: 0,
//     position: 'absolute',
//   },
//   wordmark: {
//     width: 90,
//     height: 28,
//     resizeMode: 'contain',
//     opacity: 0.9,
//   },
//   sectionBlock: {
//     marginTop: 12,
//     gap: 8,
//   },
//   card: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     backgroundColor: '#FFFFFF',
//     shadowColor: '#000',
//     shadowOpacity: 0.08,
//     shadowRadius: 6,
//     shadowOffset: { width: 0, height: 3 },
//     elevation: 2,
//   },
//   cardImage: {
//     width: '100%',
//     height: 180,
//     resizeMode: 'cover',
//   },
//   cardBody: {
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     gap: 2,
//   },
//   accentLine: {
//     width: 110,
//     height: 5,
//     borderRadius: 3,
//     backgroundColor: '#A8CFC9',
//     marginTop: 12,
//   },
// });

// app/(tabs)/index.tsx
export { default } from "../screens/HomeScreen";

